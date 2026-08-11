import type { MediaType, ProviderResult, UnifiedMediaResult } from "@/lib/types/media";

const BASE_URL = "https://api.jikan.moe/v4";

// A typeahead result count, matching the AniList adapter's SEARCH_RESULT_COUNT.
const SEARCH_RESULT_COUNT = 8;

type JikanEntry = {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: {
    jpg?: { large_image_url: string | null; image_url: string | null };
    webp?: { large_image_url: string | null; image_url: string | null };
  };
  year: number | null;
  score: number | null;
};

function toUnifiedMediaResult(entry: JikanEntry, mediaType: MediaType): UnifiedMediaResult {
  return {
    provider: "mal",
    externalId: entry.mal_id,
    mediaType,
    // title_english/title_japanese are deprecated in Jikan's own schema
    // (superseded by the `titles` array) but still present and simpler to
    // map 1:1 — verified against the published OpenAPI spec, 2026-08-11.
    title: entry.title_english ?? entry.title,
    titleNative: entry.title_japanese,
    coverImage: entry.images.jpg?.large_image_url ?? entry.images.webp?.large_image_url ?? null,
    year: entry.year,
    // Jikan's score is 0–10; UnifiedMediaResult is normalised 0–100 like
    // AniList's, so no downstream surface has to know the scales differ (D28
    // is about the user's own rating, this is the same principle applied to
    // the provider's aggregate score).
    averageScore: entry.score === null ? null : Math.round(entry.score * 10),
  };
}

function toPath(mediaType: MediaType): "anime" | "manga" {
  return mediaType === "anime" ? "anime" : "manga";
}

async function getJSON(
  url: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch,
): Promise<ProviderResult<unknown>> {
  let response: Response;
  try {
    response = await fetchImpl(url, { signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "unavailable" };
  }

  if (response.status === 404) return { ok: false, reason: "not_found" };
  if (response.status === 429) return { ok: false, reason: "rate_limited" };
  // Jikan's 504 ("...may be down/unavailable or refuses to connect") is
  // expected, frequent behaviour (tech-stack.md), not our outage — it still
  // carries CORS headers, so this is a real status the browser can see.
  if (!response.ok) return { ok: false, reason: "unavailable" };

  try {
    return { ok: true, data: await response.json() };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Same-provider retry only (D15) — a Jikan failure never falls through to
 * AniList. Retries only `"unavailable"` (Jikan's characteristic 5xx) —
 * **not** `"timeout"`. A hung connection retrying immediately would double
 * the worst case to ~2×3s and blow past criterion 9's 6s settle-time ceiling
 * for no realistic benefit; a `504` answering-but-failing is exactly the
 * case tech-stack.md records as "retry a second later frequently succeeds".
 */
async function withRetry(
  attempt: () => Promise<ProviderResult<unknown>>,
): Promise<ProviderResult<unknown>> {
  const first = await attempt();
  if (first.ok || first.reason !== "unavailable") return first;
  return attempt();
}

function withTimeout(signal: AbortSignal, ms: number): AbortSignal {
  return AbortSignal.any([signal, AbortSignal.timeout(ms)]);
}

export async function searchJikan(
  query: string,
  mediaType: MediaType,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<UnifiedMediaResult[]>> {
  const url = `${BASE_URL}/${toPath(mediaType)}?q=${encodeURIComponent(query)}&limit=${SEARCH_RESULT_COUNT}`;
  const result = await withRetry(() => getJSON(url, withTimeout(signal, 3_000), fetchImpl));
  if (!result.ok) return result;

  const body = result.data as { data?: JikanEntry[] };
  if (!body.data) return { ok: false, reason: "unavailable" };

  return { ok: true, data: body.data.map((entry) => toUnifiedMediaResult(entry, mediaType)) };
}

export async function resolveJikan(
  externalId: number,
  mediaType: MediaType,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<UnifiedMediaResult>> {
  const url = `${BASE_URL}/${toPath(mediaType)}/${externalId}`;
  const result = await withRetry(() => getJSON(url, AbortSignal.timeout(5_000), fetchImpl));
  if (!result.ok) return result;

  const body = result.data as { data?: JikanEntry };
  if (!body.data) return { ok: false, reason: "not_found" };

  return { ok: true, data: toUnifiedMediaResult(body.data, mediaType) };
}
