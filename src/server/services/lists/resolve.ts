import "server-only";
import { nanoid } from "nanoid";
import type { CreateListInput } from "@/lib/validators/list";
import type { UnifiedMediaResult } from "@/lib/types/media";
import { resolveMediaCached } from "@/server/services/media-cache";

// D36 — three bounds, each doing a different job (PHASE-4.md): the item cap
// is enforced in Zod (createListSchema), these two govern how the group
// resolves once validated.
const RESOLVE_CONCURRENCY = 4;
const RESOLVE_DEADLINE_MS = 8_000;
// D36 follow-up: budget per item *per worker round*, not per item overall —
// with 4-way concurrency an N-item list takes ceil(N/4) sequential rounds.
const RESOLVE_DEADLINE_PER_ROUND_MS = 2_000;

export const SLUG_LENGTH = 12;
export const MAX_SLUG_ATTEMPTS = 3;

export function newSlug(): string {
  return nanoid(SLUG_LENGTH);
}

/**
 * Merges an external deadline into whatever signal an adapter's own call
 * already carries, rather than modifying Phase 3's `resolveMedia` to accept
 * one — the injectable-`fetch` seam it already exposes for testing is reused
 * here for a real production concern. `AbortSignal.any` nests without limit,
 * so this composes correctly regardless of what the adapter already merged.
 */
function withDeadline(fetchImpl: typeof fetch, deadlineSignal: AbortSignal): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const signal = init?.signal
      ? AbortSignal.any([init.signal, deadlineSignal])
      : deadlineSignal;
    return fetchImpl(input, { ...init, signal });
  }) as typeof fetch;
}

export type ResolveOutcome = { ok: true; resolved: UnifiedMediaResult[] } | { ok: false };

/**
 * D36: at most 4 provider calls in flight at once, the whole group settles
 * or fails within ~8s regardless of how many items are queued behind the
 * first 4 — a per-call timeout alone cannot bound this, because later items
 * do not even start until an earlier slot frees up.
 *
 * The deadline scales with item count: 8s (the original 10-item budget)
 * floors it, and each round of 4-way concurrency beyond that adds its own
 * budget on top, so a 100-item list gets ceil(100/4) * 2s of headroom
 * instead of timing out on the same fixed 8s a 10-item list gets. This
 * still bounds the *whole request* — a very large list still holds the
 * HTTP connection open for a correspondingly long time, which is fine at
 * today's provider latencies but would need a background job if the item
 * cap or provider latency grows materially from here.
 */
export async function resolveAllItems(
  items: CreateListInput["items"],
  fetchImpl: typeof fetch,
): Promise<ResolveOutcome> {
  const rounds = Math.ceil(items.length / RESOLVE_CONCURRENCY);
  const deadlineMs = Math.max(RESOLVE_DEADLINE_MS, rounds * RESOLVE_DEADLINE_PER_ROUND_MS);
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), deadlineMs);
  const deadlineFetch = withDeadline(fetchImpl, deadline.signal);

  const results: (UnifiedMediaResult | null)[] = new Array(items.length).fill(null);
  let failed = false;
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (!failed && !deadline.signal.aborted) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      const item = items[index]!;
      const result = await resolveMediaCached(
        item.provider,
        item.externalId,
        item.mediaType,
        deadlineFetch,
      );

      if (!result.ok) {
        failed = true;
        deadline.abort();
        return;
      }
      results[index] = result.data;
    }
  }

  const workerCount = Math.min(RESOLVE_CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  clearTimeout(timer);

  if (failed || results.some((entry) => entry === null)) {
    return { ok: false };
  }
  return { ok: true, resolved: results as UnifiedMediaResult[] };
}

/**
 * D11: "statistically improbable" is not "handled". Matches on
 * `err.cause?.code` and the specific constraint name — never the message
 * text, and never a bare 23505, since `identity_per_list` and
 * `position_per_list` are also unique constraints on this table and a
 * collision there is a real input problem, not a slug retry case.
 */
export function isSlugCollision(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; constraint_name?: string } } | undefined)
    ?.cause;
  return cause?.code === "23505" && cause?.constraint_name === "list_slug_unique";
}
