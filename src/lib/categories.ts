/**
 * The fixed vocabulary a list is filed under on the rundown (D48).
 *
 * Adapted from the prototype's `POPULAR_CATEGORIES`, minus its leading `'All'` —
 * that is a UI-only "show everything" pseudo-category, and storing it on a row
 * would make "all" a category that filters to itself.
 *
 * `Eclectic / Multi-Genre` is the catch-all, and is what migration 0006's
 * backfill assigned to every pre-D48 list (none of their free-text names matched
 * a category — verified against production before the backfill was written).
 *
 * **Declared once, here, in `lib/`** — the isomorphic layer. `listCategoryEnum`
 * in `src/db/enums.ts` and `listCategorySchema` in `src/lib/validators/list.ts`
 * both consume this array. It lives here rather than beside the enum because the
 * dependency rule runs one way: `db/` may import `lib/`, never the reverse
 * (architecture.md). A second hand-maintained copy would drift the moment either
 * side gained a value, so there is a test asserting the two stay identical.
 */
export const LIST_CATEGORIES = [
  "Action",
  "Adventure",
  "Comedy",
  "Cyberpunk",
  "Drama",
  "Fantasy",
  "Horror",
  "Isekai",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
  "Eclectic / Multi-Genre",
] as const;

export type ListCategory = (typeof LIST_CATEGORIES)[number];

/**
 * The category assigned when nothing else fits — offered in the picker like any
 * other, and what the builder defaults to so that publishing never blocks on a
 * taxonomy decision the author does not care about.
 */
export const FALLBACK_LIST_CATEGORY: ListCategory = "Eclectic / Multi-Genre";

export function isListCategory(value: string): value is ListCategory {
  return (LIST_CATEGORIES as readonly string[]).includes(value);
}
