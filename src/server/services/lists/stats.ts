import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { list, listItem, listVote } from "@/db/schema";

export type GenreCount = { name: string; count: number };

/**
 * The genre cloud for a set of items, ranked by how many items carry each genre
 * and then alphabetically so the order is stable between renders. Mirrors the
 * prototype's `getListAggregatedGenres`.
 *
 * Computed in TypeScript rather than SQL because both callers have already
 * fetched the items — a second round-trip to `unnest` server-side would be a
 * query to re-derive data sitting in memory.
 */
export function aggregateGenres(items: { genres: string[] }[]): GenreCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const genre of item.genres) {
      const trimmed = genre.trim();
      if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export type DashboardStats = {
  listCount: number;
  publishedCount: number;
  totalViews: number;
  totalItems: number;
  /** Net vote score across the owner's published lists — upvotes minus downvotes. */
  totalScore: number;
};

/**
 * The dashboard's four headline numbers, aggregated in the database rather than by
 * summing listListsForUser's rows in the page: votes are not on ListView at all, and
 * item counts would otherwise be right only because that query happens to fetch every
 * item of every list.
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [row] = await db
    .select({
      listCount: sql<number>`count(*)::int`,
      publishedCount: sql<number>`count(*) filter (where ${list.published})::int`,
      totalViews: sql<number>`coalesce(sum(${list.views}), 0)::int`,
      totalItems: sql<number>`coalesce(sum((
        select count(*) from ${listItem} where ${listItem.listId} = ${list.id}
      )), 0)::int`,
      totalScore: sql<number>`coalesce(sum((
        select coalesce(sum(${listVote.direction}), 0)
        from ${listVote} where ${listVote.listId} = ${list.id}
      )), 0)::int`,
    })
    .from(list)
    .where(eq(list.userId, userId));

  return (
    row ?? {
      listCount: 0,
      publishedCount: 0,
      totalViews: 0,
      totalItems: 0,
      totalScore: 0,
    }
  );
}
