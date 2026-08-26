import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { list, listItem } from "@/db/schema";
import type { MediaType } from "@/lib/types/media";
import { feedWhere, type FeedFilters } from "@/server/services/lists/feed/where";

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
