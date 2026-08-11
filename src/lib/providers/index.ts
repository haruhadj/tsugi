import { searchAniList } from "@/lib/providers/anilist-client";
import { searchJikan } from "@/lib/providers/jikan-client";
import { logProviderFailure } from "@/lib/providers/log-provider-failure";
import type { MediaType, Provider, ProviderResult, UnifiedMediaResult } from "@/lib/types/media";

/**
 * The one place a provider is chosen. A single switch, no fall-through
 * between branches — D15 removed cross-provider fallback as a correctness
 * bug, not a simplification, and adding one here would look like a
 * reasonable resilience improvement while silently storing the wrong title
 * under a number that happens to exist in the other provider's id space.
 */
export async function searchMedia(
  provider: Provider,
  query: string,
  mediaType: MediaType,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<UnifiedMediaResult[]>> {
  const start = performance.now();
  let result: ProviderResult<UnifiedMediaResult[]>;

  switch (provider) {
    case "anilist":
      result = await searchAniList(query, mediaType, signal, fetchImpl);
      break;
    case "mal":
      result = await searchJikan(query, mediaType, signal, fetchImpl);
      break;
  }

  logProviderFailure(provider, "search", result, performance.now() - start);
  return result;
}

export type { MediaType, Provider, ProviderResult, UnifiedMediaResult } from "@/lib/types/media";
