import "server-only";
import { Redis } from "@upstash/redis";
import { getEnv } from "@/lib/env";
import { resolveMedia } from "@/server/services/media";
import type { MediaType, Provider, ProviderResult, UnifiedMediaResult } from "@/lib/types/media";

const env = getEnv();
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

if (!redis) {
  console.warn(
    "[media-cache] Upstash not configured — resolveMediaCached will call through uncached. " +
      "Unlike the rate limiter (D9), this is not a production hard-fail: a cache miss on every " +
      "call is a cost problem, not a correctness or security one.",
  );
}

const TTL_SECONDS = 24 * 60 * 60;

// `provider` leads the key deliberately (PHASE-4.md) — AniList id 154587 and
// MAL id 154587 must never collide on one cache entry, which is the same
// class of bug D15 banned at the dispatch layer, arriving by a different
// route. The `tsugi:media:` prefix is ours, not part of the spec's own
// `provider:mediaType:externalId` — it exists so this cache and the rate
// limiter's keys can share one Redis instance without risk of collision.
function cacheKey(provider: Provider, mediaType: MediaType, externalId: number): string {
  return `tsugi:media:${provider}:${mediaType}:${externalId}`;
}

/**
 * Wraps `resolveMedia` (src/server/services/media.ts) without modifying it —
 * Phase 3 designed the service specifically so caching could be layered on
 * top. Only `ok: true` results are ever cached: caching a transient Jikan
 * 504 would otherwise persist an outage for a full day.
 */
export async function resolveMediaCached(
  provider: Provider,
  externalId: number,
  mediaType: MediaType,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<UnifiedMediaResult>> {
  const key = cacheKey(provider, mediaType, externalId);

  if (redis) {
    const cached = await redis.get<UnifiedMediaResult>(key);
    if (cached) {
      console.log(`[media-cache] hit ${key}`);
      return { ok: true, data: cached };
    }
    console.log(`[media-cache] miss ${key}`);
  }

  const result = await resolveMedia(provider, externalId, mediaType, fetchImpl);

  if (redis && result.ok) {
    try {
      await redis.set(key, result.data, { ex: TTL_SECONDS });
    } catch (error) {
      // A cache write failure must never fail the request it was optimising —
      // the caller already has a real result; losing the write just means
      // the next call misses too.
      console.warn(`[media-cache] failed to write ${key}:`, error);
    }
  }

  return result;
}
