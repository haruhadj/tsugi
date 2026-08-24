import { fetchAniListGenres, searchAniList } from "@/lib/providers/anilist-client";
import { fetchJikanGenres, searchJikan } from "@/lib/providers/jikan-client";
import { logProviderFailure } from "@/lib/providers/log-provider-failure";
export { SEARCH_PAGE_SIZE } from "@/lib/providers/constants";
import type {
  MediaType,
  Provider,
  ProviderGenre,
  ProviderResult,
  UnifiedMediaResult,
} from "@/lib/types/media";

/**
 * The one place a provider is chosen. A single switch, no fall-through
 * between branches — D15 removed cross-provider fallback as a correctness
 * bug, not a simplification, and adding one here would look like a
 * reasonable resilience improvement while silently storing the wrong title
 * under a number that happens to exist in the other provider's id space.
 *
 * `genre` (D-genre-browse) is the provider's own browse token: for AniList the
 * genre name, for MAL the stringified numeric id. It is opaque here — each
 * adapter knows what its own token means.
 */
export async function searchMedia(
  provider: Provider,
  query: string,
  mediaType: MediaType,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
  genre?: string,
  page = 1,
): Promise<ProviderResult<UnifiedMediaResult[]>> {
  const start = performance.now();
  let result: ProviderResult<UnifiedMediaResult[]>;

  switch (provider) {
    case "anilist":
      result = await searchAniList(query, mediaType, signal, fetchImpl, genre, page);
      break;
    case "mal":
      result = await searchJikan(query, mediaType, signal, fetchImpl, genre, page);
      break;
  }

  logProviderFailure(provider, "search", result, performance.now() - start);
  return result;
}

/**
 * The genre vocabulary a provider offers for browsing, normalised to
 * `ProviderGenre[]` (D-genre-browse). AniList's list is shared across media
 * types (the argument is ignored there); MAL's is per media type.
 */
export async function fetchGenres(
  provider: Provider,
  mediaType: MediaType,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<ProviderGenre[]>> {
  switch (provider) {
    case "anilist": {
      const result = await fetchAniListGenres(signal, fetchImpl);
      if (!result.ok) return result;
      return { ok: true, data: result.data.map((name) => ({ id: name, label: name })) };
    }
    case "mal": {
      const result = await fetchJikanGenres(mediaType, signal, fetchImpl);
      if (!result.ok) return result;
      return {
        ok: true,
        data: result.data.map((g) => ({ id: String(g.mal_id), label: g.name })),
      };
    }
  }
}

export type {
  MediaType,
  Provider,
  ProviderGenre,
  ProviderResult,
  UnifiedMediaResult,
} from "@/lib/types/media";
