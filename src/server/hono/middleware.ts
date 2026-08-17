import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getEnv } from "@/lib/env";

const env = getEnv();
const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

// D9 — requiring an Upstash account to run the homepage locally is friction
// with no benefit, but serverless instances share no memory: an in-memory
// limiter in production is not a weaker limiter, it is no limiter, silently.
// This throw is what turns that into a startup failure instead.
if (!hasUpstash && process.env.NODE_ENV === "production") {
  throw new Error(
    "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required when NODE_ENV=production (D9). " +
      "Set both, or the rate limiter silently disappears under serverless concurrency.",
  );
}

if (!hasUpstash) {
  console.warn(
    "[rate-limit] Upstash not configured — using an in-memory limiter. This is fine for local " +
      "development and would be a bug in production (D9).",
  );
}

const TOKENS_PER_WINDOW = 5;
const WINDOW_MS = 60_000;

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms timestamp when the window resets. */
  reset: number;
};

interface RateLimiter {
  limit(identifier: string): Promise<LimitResult>;
}

/**
 * Mirrors `@upstash/ratelimit`'s sliding-window shape closely enough for
 * local development — not a spec, just enough behaviour that a dev never
 * needs an Upstash account to exercise the create flow. Per-process only;
 * useless across serverless instances, which is exactly why production
 * refuses to start without the real thing.
 */
class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly tokens: number,
    private readonly windowMs: number,
  ) {}

  async limit(identifier: string): Promise<LimitResult> {
    const now = Date.now();
    const timestamps = (this.hits.get(identifier) ?? []).filter(
      (hitAt) => now - hitAt < this.windowMs,
    );

    const success = timestamps.length < this.tokens;
    if (success) timestamps.push(now);
    this.hits.set(identifier, timestamps);

    const oldest = timestamps[0] ?? now;
    return {
      success,
      limit: this.tokens,
      remaining: Math.max(0, this.tokens - timestamps.length),
      reset: oldest + this.windowMs,
    };
  }
}

const limiter: RateLimiter = hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(TOKENS_PER_WINDOW, "1 m"),
      prefix: "tsugi:ratelimit",
    })
  : new InMemoryRateLimiter(TOKENS_PER_WINDOW, WINDOW_MS);

export type RecCreateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Keyed on the session user id, never the IP (D34) — creating always has a
 * session (D23), and behind a proxy the forwarded-header's leftmost value is
 * attacker-supplied. Call this **after** confirming a session exists; an
 * unauthenticated request should never reach here; it gets 401 first.
 */
export async function checkRecCreateLimit(userId: string): Promise<RecCreateLimitResult> {
  const result = await limiter.limit(`rec:create:${userId}`);
  if (result.success) return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}

export type ListCreateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** Same D34/D23 rules as {@link checkRecCreateLimit}, distinct key prefix. */
export async function checkListCreateLimit(userId: string): Promise<ListCreateLimitResult> {
  const result = await limiter.limit(`list:create:${userId}`);
  if (result.success) return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}

export type VoteLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Same D34/D23 rules as {@link checkRecCreateLimit}, distinct key prefix. */
export async function checkVoteLimit(userId: string): Promise<VoteLimitResult> {
  const result = await limiter.limit(`vote:${userId}`);
  if (result.success) return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}

export type UsernameUpdateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** Same D34/D23 rules as {@link checkRecCreateLimit}, distinct key prefix. */
export async function checkUsernameUpdateLimit(userId: string): Promise<UsernameUpdateLimitResult> {
  const result = await limiter.limit(`username:update:${userId}`);
  if (result.success) return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}
