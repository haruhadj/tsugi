import type { MediaType } from "@/lib/types/media";

/**
 * How the rundown's query string is narrowed into `FeedFilters`.
 *
 * Both entry points — the `/feed` page and `GET /api/feed` — read the same
 * params, and an unknown value has to mean the same thing in both or a shared
 * link renders differently than the API that backs it. So the narrowing lives
 * here rather than twice.
 *
 * The rule throughout, inherited from how `?sort=` and `?category=` already
 * behave: **an unrecognised value falls back to unfiltered, never to an empty
 * page.** A stale chip in someone's bookmark should show the whole rundown.
 */

/**
 * Rows per page, everywhere. The `/feed` page, `GET /api/feed` and the infinite
 * scroll that consumes it all have to agree: the client decides it has reached
 * the end by getting back fewer rows than it asked for, so a server that
 * silently used a different size would either stop the feed early or never stop
 * it at all.
 */
export const FEED_PAGE_SIZE = 20;

/** Matches `MediaSearchInput`'s floor — below two characters a substring search
 *  matches most of the table, which is the same as not filtering but slower. */
export const FEED_SEARCH_MIN_LENGTH = 2;

/** Long enough for a title, short enough that the ILIKE stays bounded. */
const FEED_SEARCH_MAX_LENGTH = 100;

export function normalizeFeedQuery(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < FEED_SEARCH_MIN_LENGTH) return undefined;
  return trimmed.slice(0, FEED_SEARCH_MAX_LENGTH);
}

export function normalizeMediaType(value: string | undefined): MediaType | undefined {
  return value === "anime" || value === "manga" ? value : undefined;
}

/** The rundown's URL state, already narrowed. `sort` is a plain string here so
 *  this module stays free of the server-only service that owns `FeedSort`. */
export type FeedUrlState = {
  sort: string;
  page: number;
  category?: string;
  genre?: string;
  mediaType?: MediaType;
  q?: string;
};

/**
 * Builds a `/feed` href from the current state plus an override.
 *
 * The override uses **key presence**, not value truthiness: `{ category: undefined }`
 * clears the category, while an absent `category` key keeps whatever is active.
 * That is what lets the same function build both a "filter by this" link and a
 * "remove this filter" one.
 *
 * Lives here rather than in the page because the sidebar's client controls need
 * it too, and a function cannot be handed across the server/client boundary —
 * they receive the plain `FeedUrlState` and call this themselves.
 *
 * Any change of filter returns to page 1: page N of the old result set says
 * nothing about the new one.
 */
export function buildFeedHref(
  current: FeedUrlState,
  next: Partial<FeedUrlState> = {},
): string {
  return `/feed?${buildFeedQuery(current, next)}`;
}

/** The page's own `hrefFor` closure, threaded through the JSX it builds for
 *  `FeedList` — every link on `/feed` is `hrefFor` applied to one changed field. */
export type HrefFor = (next?: Partial<FeedUrlState>) => string;

/**
 * The query string on its own, without the `/feed` in front of it.
 *
 * Split out of `buildFeedHref` for the rundown's infinite scroll, which asks
 * `GET /api/feed` for the next page and has to describe the *same* filters the
 * page was rendered with. Sharing this is the point: the API and the page read
 * their params through one narrowing (`filtersFrom` in `server/hono/feed.ts`
 * and `FeedPage` respectively), so they must also be written by one builder, or
 * page 2 of a filtered rundown can quietly differ from page 1.
 */
export function buildFeedQuery(
  current: FeedUrlState,
  next: Partial<FeedUrlState> = {},
): string {
  const pick = <K extends keyof FeedUrlState>(key: K): FeedUrlState[K] | undefined =>
    key in next ? next[key] : current[key];

  const query = new URLSearchParams({ sort: pick("sort") ?? current.sort });
  const category = pick("category");
  const genre = pick("genre");
  const mediaType = pick("mediaType");
  const q = pick("q");
  if (category) query.set("category", category);
  if (genre) query.set("genre", genre);
  if (mediaType) query.set("mediaType", mediaType);
  if (q) query.set("q", q);

  const page = "page" in next ? next.page : 1;
  if (page && page > 1) query.set("page", String(page));

  return String(query);
}
