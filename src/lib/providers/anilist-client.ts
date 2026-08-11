import type { MediaType, ProviderResult, UnifiedMediaResult } from "@/lib/types/media";

const ENDPOINT = "https://graphql.anilist.co";

// A typeahead result count, not a page size — this is spent from the user's
// own 30/min budget (D3), so there is no reason to fetch more than a
// dropdown shows.
const SEARCH_RESULT_COUNT = 8;

const SEARCH_QUERY = `
  query ($search: String, $type: MediaType, $perPage: Int) {
    Page(perPage: $perPage) {
      media(search: $search, type: $type) {
        id
        type
        title { english romaji native }
        coverImage { extraLarge large }
        startDate { year }
        averageScore
      }
    }
  }
`;

const RESOLVE_QUERY = `
  query ($id: Int, $type: MediaType) {
    Media(id: $id, type: $type) {
      id
      type
      title { english romaji native }
      coverImage { extraLarge large }
      startDate { year }
      averageScore
    }
  }
`;

type AniListMedia = {
  id: number;
  type: "ANIME" | "MANGA";
  title: { english: string | null; romaji: string | null; native: string | null };
  coverImage: { extraLarge: string | null; large: string | null } | null;
  startDate: { year: number | null } | null;
  averageScore: number | null;
};

function toMediaType(type: "ANIME" | "MANGA"): MediaType {
  return type === "ANIME" ? "anime" : "manga";
}

// The adapter picks the title once (PHASE-3.md "title chosen in adapter, not
// downstream") — English is frequently null (verified live: Frieren's third
// season has none), so no component ever writes this fallback chain again.
function pickTitle(title: AniListMedia["title"]): string {
  return title.english ?? title.romaji ?? title.native ?? "Untitled";
}

function toUnifiedMediaResult(media: AniListMedia): UnifiedMediaResult {
  return {
    provider: "anilist",
    externalId: media.id,
    mediaType: toMediaType(media.type),
    title: pickTitle(media.title),
    titleNative: media.title.native,
    coverImage: media.coverImage?.extraLarge ?? media.coverImage?.large ?? null,
    year: media.startDate?.year ?? null,
    // AniList's averageScore is already 0–100 — no conversion (unlike Jikan's 0–10).
    averageScore: media.averageScore,
  };
}

function toGraphQLMediaType(mediaType: MediaType): "ANIME" | "MANGA" {
  return mediaType === "anime" ? "ANIME" : "MANGA";
}

async function postGraphQL(
  body: unknown,
  signal: AbortSignal,
  fetchImpl: typeof fetch,
): Promise<ProviderResult<unknown>> {
  let response: Response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // AbortError from either the caller's signal or our own timeout — both
    // collapse to "timeout" here, since a caller-cancelled search has no
    // observer left to distinguish it from one either.
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "unavailable" };
  }

  if (response.status === 429) return { ok: false, reason: "rate_limited" };
  // AniList returns a genuine HTTP 404 for an id that resolves to nothing —
  // verified live, 2026-08-11: `{"errors":[{"message":"Not Found.","status":404}],
  // "data":{"Media":null}}`. Not a GraphQL-200-with-null-data shape, so this
  // has to be caught before the generic !response.ok fallthrough or a real
  // "not found" gets reported as a generic outage.
  if (response.status === 404) return { ok: false, reason: "not_found" };
  if (!response.ok) return { ok: false, reason: "unavailable" };

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, data: json };
}

/**
 * Combines the caller's own cancellation signal (a debounced typeahead
 * aborting a stale keystroke's request) with a self-imposed ceiling, so a
 * hung request can never outlive it even if the caller never cancels.
 * Invariant 11 requires the ceiling; the deliverable signature requires the
 * caller's signal be honoured — `AbortSignal.any` is both at once.
 */
function withTimeout(signal: AbortSignal, ms: number): AbortSignal {
  return AbortSignal.any([signal, AbortSignal.timeout(ms)]);
}

export async function searchAniList(
  query: string,
  mediaType: MediaType,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<UnifiedMediaResult[]>> {
  const result = await postGraphQL(
    {
      query: SEARCH_QUERY,
      variables: {
        search: query,
        type: toGraphQLMediaType(mediaType),
        perPage: SEARCH_RESULT_COUNT,
      },
    },
    withTimeout(signal, 3_000),
    fetchImpl,
  );
  if (!result.ok) return result;

  const body = result.data as { data?: { Page?: { media?: AniListMedia[] } } };
  const media = body.data?.Page?.media;
  if (!media) return { ok: false, reason: "unavailable" };

  return { ok: true, data: media.map(toUnifiedMediaResult) };
}

export async function resolveAniList(
  externalId: number,
  mediaType: MediaType,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<UnifiedMediaResult>> {
  const result = await postGraphQL(
    { query: RESOLVE_QUERY, variables: { id: externalId, type: toGraphQLMediaType(mediaType) } },
    AbortSignal.timeout(5_000),
    fetchImpl,
  );
  if (!result.ok) return result;

  const body = result.data as { data?: { Media?: AniListMedia | null } };
  const media = body.data?.Media;
  if (!media) return { ok: false, reason: "not_found" };

  return { ok: true, data: toUnifiedMediaResult(media) };
}
