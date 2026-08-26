import "server-only";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { list, listItem, listVote } from "@/db/schema";
import type { ListCategory } from "@/lib/categories";
import type { MediaType, ScoreFormat } from "@/lib/types/media";
import { aggregateGenres } from "@/server/services/lists/stats";

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
 * Everything the rundown can be narrowed by. One type, because the row query and
 * all three sidebar count queries have to agree on it — a sidebar that counts a
 * different population than the list beneath it is worse than no counts at all.
 */
export type FeedFilters = {
  // The fixed vocabulary, not a free string — the route narrows an unknown
  // `?category=` to undefined before it reaches here (D48).
  category?: ListCategory;
  genre?: string;
  mediaType?: MediaType;
  /** Already trimmed and floored at 2 characters by the caller. */
  q?: string;
};

/**
 * `%` and `_` are wildcards inside ILIKE, so a user searching for "100%" would
 * otherwise match everything after "100". `\` escapes them, and itself first.
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * The one place the feed's WHERE is built. Four callers need it — the row query
 * and the three facet counts — and each of the facet queries drops its *own*
 * dimension (see `omit`), which is only safe to express once.
 *
 * Both item-level filters are correlated `EXISTS` subqueries rather than joins,
 * for the reason `itemCountExpr` documents: joining `list_item` multiplies
 * against the `list_vote` leftJoin and corrupts every aggregate in the select.
 */
function feedWhere(filters: FeedFilters) {
  const { category, genre, mediaType, q } = filters;
  const pattern = q ? `%${escapeLike(q)}%` : null;

  return and(
    eq(list.published, true),
    category ? eq(list.category, category) : undefined,
    genre
      ? sql`exists (
          select 1 from ${listItem}
          where ${listItem.listId} = ${list.id} and ${genre} = any(${listItem.genres})
        )`
      : undefined,
    mediaType
      ? sql`exists (
          select 1 from ${listItem}
          where ${listItem.listId} = ${list.id} and ${listItem.mediaType} = ${mediaType}
        )`
      : undefined,
    // Everything a reader can see on a feed row is searchable, plus the item
    // titles behind it — "the list with Frieren in it" is how people look for a
    // list they have read before, and the row itself never names its items.
    pattern
      ? sql`(
          ${list.name} ilike ${pattern} escape '\\'
          or ${list.caption} ilike ${pattern} escape '\\'
          or ${list.category}::text ilike ${pattern} escape '\\'
          or ${user.username} ilike ${pattern} escape '\\'
          or exists (
            select 1 from ${listItem}
            where ${listItem.listId} = ${list.id}
              and ${listItem.title} ilike ${pattern} escape '\\'
          )
        )`
      : undefined,
  );
}

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

/**
 * The categories actually in use across published lists, most-used first, for
 * the rundown's directory.
 *
 * Since D48 this groups `list.category` — a fixed vocabulary — rather than the
 * free-text `name` it used to. Only categories with at least one published list
 * are returned: the directory is "where there is something to read", not a
 * table of contents with nineteen empty rows. The 20 cap is now larger than the
 * vocabulary itself and kept only so this can never blow out the sidebar.
 */
export type FeedCategory = { name: string; count: number };

/**
 * Every facet query below drops its *own* dimension from the filters before
 * counting. Counting categories under an active category filter would collapse
 * the directory to the one row already selected, and the panel would stop being
 * a way to move sideways — which is the only thing it is for.
 */
export async function listFeedCategories(filters: FeedFilters = {}): Promise<FeedCategory[]> {
  const rows = await db
    .select({ name: list.category, count: sql<number>`count(*)::int` })
    .from(list)
    // Joined even when nothing searches on it: `feedWhere` reaches for
    // `user.username`, so the column has to be in scope for every caller.
    .innerJoin(user, eq(list.userId, user.id))
    .where(feedWhere({ ...filters, category: undefined }))
    .groupBy(list.category)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  return rows;
}

/**
 * Counts for the format panel. `all` is counted separately rather than summed
 * from the other two — a list holding both anime and manga belongs to both, so
 * adding them would over-count it.
 */
export type FeedMediaTypeCounts = { all: number; anime: number; manga: number };

export async function listFeedMediaTypeCounts(
  filters: FeedFilters = {},
): Promise<FeedMediaTypeCounts> {
  const base = { ...filters, mediaType: undefined };

  const countFor = async (mediaType: MediaType | undefined) => {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(list)
      .innerJoin(user, eq(list.userId, user.id))
      .where(feedWhere({ ...base, mediaType }));
    return row?.count ?? 0;
  };

  const [all, anime, manga] = await Promise.all([
    countFor(undefined),
    countFor("anime"),
    countFor("manga"),
  ]);

  return { all, anime, manga };
}

/**
 * Every published list, unfiltered. Deliberately not derived from the category
 * facet's counts: those respect the reader's active filters, and the one place
 * this is used — the sidebar's call to action — is quoting a fact about the
 * product rather than about the current view.
 */
export async function countPublishedLists(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(list)
    .where(eq(list.published, true));
  return row?.count ?? 0;
}

/**
 * The genre directory beside the category one — how many published lists carry
 * each genre on at least one of their items.
 *
 * `count(distinct list.id)`, not `count(*)`: a list with four Fantasy titles is
 * one Fantasy list, and counting rows would rank a single long list above ten
 * short ones. Unnesting in a lateral join keeps this to one query over the GIN
 * index rather than a read-all-then-aggregate in TypeScript, which is what the
 * per-row aggregation above does — this one spans the whole table.
 */
export async function listFeedGenres(filters: FeedFilters = {}): Promise<FeedCategory[]> {
  const rows = await db.execute<{ name: string; count: number }>(sql`
    select genre as name, count(distinct ${list.id})::int as count
    from ${list}
    join ${user} on ${list.userId} = ${user.id}
    join ${listItem} on ${listItem.listId} = ${list.id}
    cross join lateral unnest(${listItem.genres}) as genre
    where ${feedWhere({ ...filters, genre: undefined })}
    group by genre
    order by count desc, genre asc
    limit 20
  `);

  return [...rows];
}
