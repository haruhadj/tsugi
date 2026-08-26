import "server-only";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { list, listItem, listVote } from "@/db/schema";
import type { ScoreFormat } from "@/lib/types/media";
import { aggregateGenres } from "@/server/services/lists/stats";
import { feedWhere, type FeedFilters } from "@/server/services/lists/feed/where";

export const FEED_SORTS = ["top", "new", "views", "items"] as const;
export type FeedSort = (typeof FEED_SORTS)[number];

export type FeedCover = {
  coverImage: string | null;
  title: string;
  // Kept as the `(raw, format)` pair the rest of the product passes around, so
  // an imported 87/100 still badges as 87/100 (D47) rather than being coerced.
  scoreRaw: number | null;
  scoreFormat: ScoreFormat | null;
};

export type FeedEntry = {
  slug: string;
  name: string;
  category: string;
  caption: string | null;
  views: number;
  publishedAt: Date | null;
  createdAt: Date;
  score: number;
  itemCount: number;
  /** Rendered as `u/{username}` (D49). Null for lists whose author predates
   *  mandatory handles and has not signed in since — those show no author line. */
  authorUsername: string | null;
  /** The first few titles, for the feed's filmstrip. Carries the title and score
   *  as well as the art so each cover can be labelled and badged rather than
   *  rendered as decoration; `coverImage` stays nullable so a list whose lead
   *  title has no art still shows its placeholder in order. */
  covers: FeedCover[];
  /** The row's genre chips, aggregated from its items. Capped — a feed row has
   *  no room for the full cloud, and the artifact page shows all of them. */
  genres: string[];
  /** The signed-in reader's own vote on this list, so the arrows come back lit
   *  after a refresh or on another device. 0 for signed-out readers. */
  myDirection: 1 | -1 | 0;
};

/** Genre chips per feed row. The rest are on /r/[slug], which has the room. */
const FEED_GENRE_COUNT = 3;

/** How many covers each feed row carries. Enough to fill the filmstrip, no more. */
const FEED_COVER_COUNT = 10;

/**
 * Public, published-only (D42) — no `userId` in the selected columns
 * (invariant 1). Score is a live `SUM(direction)` aggregate, not a
 * denormalized counter (Phase C decision: correctness over an extra write
 * on every vote, revisit only if this proves too slow at scale).
 */
export async function listPublishedFeed(
  params: FeedFilters & {
    page: number;
    pageSize: number;
    sort: FeedSort;
    /** The signed-in reader, so each row can carry their own vote back. */
    viewerId?: string | null;
  },
): Promise<FeedEntry[]> {
  const { page, pageSize, sort, viewerId, ...filters } = params;
  /*
    Every aggregate here is cast to int. Postgres returns count() as bigint and sum()
    as numeric, both of which postgres.js hands back as *strings* to avoid precision
    loss — so without the cast these arrive typed `number` but valued "3", and every
    `=== 1` comparison downstream silently fails.
  */
  const scoreExpr = sql<number>`coalesce(sum(${listVote.direction}), 0)::int`;
  /*
    Counted as a correlated subquery rather than a second leftJoin: joining both
    list_vote and list_item against list multiplies their rows together, and every
    aggregate over that product is then wrong (a list with 3 votes and 4 items would
    report 12 of each).
  */
  const itemCountExpr = sql<number>`(
    select count(*)::int from ${listItem} where ${listItem.listId} = ${list.id}
  )`;
  /*
    The viewer's own vote, read off the same leftJoin the score aggregates: at most
    one list_vote row per (list, user), so max() over the group picks it out without
    a second join. Signed-out readers skip the correlation entirely.
  */
  const myDirectionExpr = viewerId
    ? sql<1 | -1 | 0>`coalesce(max(case when ${listVote.userId} = ${viewerId} then ${listVote.direction} end), 0)::int`
    : sql<1 | -1 | 0>`0::int`;
  const whereExpr = feedWhere(filters);

  const orderBy = {
    top: desc(scoreExpr),
    new: desc(list.publishedAt),
    views: desc(list.views),
    items: desc(itemCountExpr),
  }[sort];

  const rows = await db
    .select({
      slug: list.slug,
      name: list.name,
      category: list.category,
      caption: list.caption,
      views: list.views,
      publishedAt: list.publishedAt,
      createdAt: list.createdAt,
      score: scoreExpr,
      itemCount: itemCountExpr,
      authorUsername: user.username,
      myDirection: myDirectionExpr,
    })
    .from(list)
    .leftJoin(listVote, eq(listVote.listId, list.id))
    // Inner join on a NOT NULL FK — one author row per list, so this cannot
    // drop or duplicate a row the way the list_vote/list_item pairing would.
    // Grouped by user.id as well as list.id: `username` is not functionally
    // dependent on list.id as far as Postgres is concerned.
    .innerJoin(user, eq(list.userId, user.id))
    .where(whereExpr)
    .groupBy(list.id, user.id)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (rows.length === 0) return [];

  const slugs = rows.map((row) => row.slug);
  const coverRows = await db
    .select({
      slug: list.slug,
      position: listItem.position,
      coverImage: listItem.coverImage,
      title: listItem.title,
      scoreRaw: listItem.scoreRaw,
      scoreFormat: listItem.scoreFormat,
    })
    .from(listItem)
    .innerJoin(list, eq(listItem.listId, list.id))
    // `position` is the 0-based array index assigned in createList, so the first
    // FEED_COVER_COUNT items are 0..COUNT-1 — `lt`, not `lte`.
    .where(and(inArray(list.slug, slugs), lt(listItem.position, FEED_COVER_COUNT)))
    .orderBy(listItem.position);

  const coversBySlug = new Map<string, FeedCover[]>();
  for (const { slug, position: _position, ...cover } of coverRows) {
    const bucket = coversBySlug.get(slug);
    if (bucket) {
      bucket.push(cover);
    } else {
      coversBySlug.set(slug, [cover]);
    }
  }

  /*
    Genres are read over *every* item of the listed lists, not just the first
    FEED_COVER_COUNT — a row's chips should describe the whole list, and the
    lead titles are not a representative sample of it. Separate from the cover
    query for that reason, rather than widening that one's WHERE.
  */
  const genreRows = await db
    .select({ slug: list.slug, genres: listItem.genres })
    .from(listItem)
    .innerJoin(list, eq(listItem.listId, list.id))
    .where(inArray(list.slug, slugs));

  const genreItemsBySlug = new Map<string, { genres: string[] }[]>();
  for (const row of genreRows) {
    const bucket = genreItemsBySlug.get(row.slug);
    if (bucket) {
      bucket.push({ genres: row.genres });
    } else {
      genreItemsBySlug.set(row.slug, [{ genres: row.genres }]);
    }
  }

  return rows.map((row) => ({
    ...row,
    covers: coversBySlug.get(row.slug) ?? [],
    genres: aggregateGenres(genreItemsBySlug.get(row.slug) ?? [])
      .slice(0, FEED_GENRE_COUNT)
      .map((genre) => genre.name),
  }));
}
