import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { list, listItem, listVote, listView } from "@/db/schema";
import { aggregateGenres, type GenreCount } from "@/server/services/lists/stats";

export type ListView = {
  slug: string;
  name: string;
  category: string;
  caption: string | null;
  comment: string | null;
  views: number;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  /**
   * The author's chosen handle, rendered as `u/{username}` (D49). Null only for
   * lists published before handles became mandatory, whose owner has not signed
   * in since — those render no author line rather than an invented one.
   */
  authorUsername: string | null;
  /**
   * Whether the caller owns this list — derived from the `viewerId` that was
   * passed in, so it is a fact about *this* read rather than about the row
   * (**D59**). It is what gates the edit affordance on `/r/[slug]`; invariant 1
   * is untouched, since a boolean is not an identifier.
   */
  isOwner: boolean;
  /** Net vote score, summed live from `list_vote` — the same number the feed row shows. */
  score: number;
  /**
   * The signed-in reader's own vote on this list, so the arrows come back lit after
   * a refresh or on another device. 0 for signed-out readers.
   */
  myDirection: 1 | -1 | 0;
  /**
   * The list's genre cloud, aggregated from its items at read time rather than
   * stored on the list — a stored copy is a second source of truth that drifts
   * the first time an item is added. Frequency-ranked, most common first.
   */
  genres: GenreCount[];
  items: {
    position: number;
    provider: string;
    externalId: number;
    mediaType: string;
    title: string;
    coverImage: string | null;
    scoreRaw: number | null;
    scoreFormat: string | null;
    comment: string | null;
    genres: string[];
  }[];
};

export const itemColumns = {
  position: listItem.position,
  provider: listItem.provider,
  externalId: listItem.externalId,
  mediaType: listItem.mediaType,
  title: listItem.title,
  coverImage: listItem.coverImage,
  scoreRaw: listItem.scoreRaw,
  scoreFormat: listItem.scoreFormat,
  comment: listItem.comment,
  genres: listItem.genres,
};

/**
 * Invariant 1, criterion 18a — every column selected explicitly. A
 * `select *` here is how a database id (or the owner's userId) leaks to
 * every anonymous reader of a shared link; there is no field named merely
 * "id" anywhere in the returned shape.
 *
 * Unpublished lists are owner-only (D42): a caller passing a `viewerId` that
 * does not match the list's owner sees the same `null` as a nonexistent
 * slug, so `/r/[slug]` cannot distinguish "draft" from "never existed" for
 * anyone but the owner.
 */
export async function getListBySlug(
  slug: string,
  viewerId: string | null,
): Promise<ListView | null> {
  const [row] = await db
    .select({
      slug: list.slug,
      name: list.name,
      category: list.category,
      caption: list.caption,
      comment: list.comment,
      views: list.views,
      published: list.published,
      publishedAt: list.publishedAt,
      createdAt: list.createdAt,
      userId: list.userId,
      authorUsername: user.username,
      /*
        Correlated subqueries rather than a leftJoin on list_vote: this select is
        a single row and a join would have forced a GROUP BY over every column.
        Cast to int for the reason listPublishedFeed documents — sum() comes back
        from postgres.js as a string otherwise, and `=== 1` then silently fails.
      */
      score: sql<number>`(
        select coalesce(sum(${listVote.direction}), 0)::int
        from ${listVote} where ${listVote.listId} = ${list.id}
      )`,
      myDirection: viewerId
        ? sql<1 | -1 | 0>`(
            select coalesce(max(${listVote.direction}), 0)::int
            from ${listVote}
            where ${listVote.listId} = ${list.id} and ${listVote.userId} = ${viewerId}
          )`
        : sql<1 | -1 | 0>`0::int`,
    })
    .from(list)
    // Inner rather than left: `list.userId` is NOT NULL and references
    // `user.id`, so every list has exactly one author row — the join cannot
    // drop a list or duplicate one. `user.username` itself may still be null.
    .innerJoin(user, eq(list.userId, user.id))
    .where(eq(list.slug, slug))
    .limit(1);

  if (!row) return null;
  if (!row.published && row.userId !== viewerId) return null;

  const items = await db
    .select(itemColumns)
    .from(listItem)
    .innerJoin(list, eq(listItem.listId, list.id))
    .where(eq(list.slug, slug))
    .orderBy(listItem.position);

  const { userId, ...rest } = row;
  return {
    ...rest,
    isOwner: viewerId !== null && userId === viewerId,
    items,
    genres: aggregateGenres(items),
  };
}

/**
 * Fire-and-forget from the page route only (PHASE-6.md) — never awaited by
 * the caller, so this swallows its own errors rather than letting a view-count
 * failure surface as a page error. Atomic `SET views = views + 1` rather than
 * read-modify-write avoids lost updates under concurrent hits on the same slug.
 *
 * Only logged-in views count (anonymous views are never counted). `userId`
 * dedups against `listView`, a durable per-(list,user) record — the view
 * only counts if that insert actually lands a new row, so repeat visits from
 * any device or browser session never double-count.
 */
export async function incrementViewCount(slug: string, userId: string): Promise<void> {
  try {
    const [row] = await db.select({ id: list.id }).from(list).where(eq(list.slug, slug));
    if (!row) return;

    const inserted = await db
      .insert(listView)
      .values({ listId: row.id, userId })
      .onConflictDoNothing()
      .returning({ id: listView.id });
    if (inserted.length === 0) return;

    await db
      .update(list)
      .set({ views: sql`${list.views} + 1` })
      .where(eq(list.id, row.id));
  } catch {
    // Swallowed by design — a lost view count is not worth a page failure.
  }
}

/**
 * PHASE-8.md criterion 1: dashboard scope is `userId`, not eyeballing. Same
 * explicit-column shape as `getListBySlug` (invariant 1) — no bare "id" or
 * `userId` leaves this function either, even though the caller already
 * knows whose lists these are. Includes both draft and published lists
 * (D42) — the dashboard is where a user manages the publish state.
 */
export async function listListsForUser(userId: string): Promise<ListView[]> {
  const rows = await db
    .select({
      slug: list.slug,
      name: list.name,
      category: list.category,
      caption: list.caption,
      comment: list.comment,
      views: list.views,
      published: list.published,
      publishedAt: list.publishedAt,
      createdAt: list.createdAt,
      // Deliberately not joined to `user` here: every row belongs to the
      // caller, so the author is already known and a join would be a
      // per-row lookup of a value the page has in its own session.
      authorUsername: sql<string | null>`null`,
      score: sql<number>`(
        select coalesce(sum(${listVote.direction}), 0)::int
        from ${listVote} where ${listVote.listId} = ${list.id}
      )`,
      // The caller owns every row here, and an author's own vote on their own
      // list is not something the dashboard shows — so this is a constant rather
      // than a second correlated read.
      myDirection: sql<1 | -1 | 0>`0::int`,
    })
    .from(list)
    .where(eq(list.userId, userId))
    .orderBy(desc(list.createdAt));

  if (rows.length === 0) return [];

  const items = await db
    .select({ slug: list.slug, ...itemColumns })
    .from(listItem)
    .innerJoin(list, eq(listItem.listId, list.id))
    .where(eq(list.userId, userId))
    .orderBy(listItem.position);

  const itemsBySlug = new Map<string, ListView["items"]>();
  for (const { slug, ...item } of items) {
    const bucket = itemsBySlug.get(slug);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsBySlug.set(slug, [item]);
    }
  }

  return rows.map((row) => {
    const listItems = itemsBySlug.get(row.slug) ?? [];
    // Every row here was selected by `userId` — the caller owns all of them.
    return { ...row, isOwner: true, items: listItems, genres: aggregateGenres(listItems) };
  });
}

/**
 * The edit route's read (**D59**). `getListBySlug` would happily return someone
 * else's *published* list — right for the artifact page, wrong for an editor,
 * which must show a list only to the person allowed to change it. Owning the
 * ownership check here rather than in the page keeps it out of reach of a
 * future caller that forgets to apply it.
 */
export async function getOwnedListBySlug(
  slug: string,
  userId: string,
): Promise<ListView | null> {
  const view = await getListBySlug(slug, userId);
  return view?.isOwner ? view : null;
}
