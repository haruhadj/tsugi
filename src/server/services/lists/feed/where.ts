import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { user } from "@/db/auth-schema";
import { list, listItem } from "@/db/schema";
import type { ListCategory } from "@/lib/categories";
import type { MediaType } from "@/lib/types/media";

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
export function feedWhere(filters: FeedFilters) {
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
