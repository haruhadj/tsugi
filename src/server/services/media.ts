import "server-only";
import { resolveAniList } from "@/lib/providers/anilist-client";
import { resolveJikan } from "@/lib/providers/jikan-client";
import { logProviderFailure } from "@/lib/providers/log-provider-failure";
import type { MediaType, Provider, ProviderResult, UnifiedMediaResult } from "@/lib/types/media";

/**
 * Server-side resolve-by-id, one provider only — the dispatch-module twin of
 * `searchMedia`, and the same rule applies: a single switch, no fall-through.
 * `resolveMedia("mal", 154587, …)` must never return AniList's Frieren just
 * because 154587 happens to be its id there (PHASE-3.md criterion 6).
 */
export async function resolveMedia(
  provider: Provider,
  externalId: number,
  mediaType: MediaType,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<UnifiedMediaResult>> {
  const start = performance.now();
  let result: ProviderResult<UnifiedMediaResult>;

  switch (provider) {
    case "anilist":
      result = await resolveAniList(externalId, mediaType, fetchImpl);
      break;
    case "mal":
      result = await resolveJikan(externalId, mediaType, fetchImpl);
      break;
  }

  logProviderFailure(provider, "resolve", result, performance.now() - start);
  return result;
}
