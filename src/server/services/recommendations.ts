import "server-only";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { recommendation, recommendationItem } from "@/db/schema";
import type { CreateRecInput } from "@/lib/validators/rec";
import type { UnifiedMediaResult } from "@/lib/types/media";
import { resolveMediaCached } from "@/server/services/media-cache";

// D36 — three bounds, each doing a different job (PHASE-4.md): the item cap
// is enforced in Zod (createRecSchema), these two govern how the group
// resolves once validated.
const RESOLVE_CONCURRENCY = 4;
const RESOLVE_DEADLINE_MS = 8_000;

const SLUG_LENGTH = 12;
const MAX_SLUG_ATTEMPTS = 3;

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

type ResolveOutcome = { ok: true; resolved: UnifiedMediaResult[] } | { ok: false };

/**
 * D36: at most 4 provider calls in flight at once, the whole group settles
 * or fails within ~8s regardless of how many items are queued behind the
 * first 4 — a per-call timeout alone cannot bound this, because later items
 * do not even start until an earlier slot frees up.
 */
async function resolveAllItems(
  items: CreateRecInput["items"],
  fetchImpl: typeof fetch,
): Promise<ResolveOutcome> {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), RESOLVE_DEADLINE_MS);
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
 * text, and never a bare 23505, since `identity_per_recommendation` and
 * `position_per_recommendation` are also unique constraints on this table
 * and a collision there is a real input problem, not a slug retry case.
 */
function isSlugCollision(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; constraint_name?: string } } | undefined)
    ?.cause;
  return cause?.code === "23505" && cause?.constraint_name === "recommendation_slug_unique";
}

export type CreateRecommendationResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "resolve_failed" };

/**
 * The create flow's core, independent of HTTP, session, and rate limiting —
 * those are the Hono route's job (`src/server/hono/recs.ts`), which calls
 * this only once a session and a validated body both exist. Takes a plain
 * `userId` rather than a session object so it can be exercised directly
 * against a real Postgres test user (same pattern as `schema.db.test.ts`),
 * without needing a real signed session cookie — which Better-Auth's
 * OAuth-only configuration here has no way to fabricate outside a browser.
 */
export async function createRecommendation(
  userId: string,
  input: CreateRecInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CreateRecommendationResult> {
  // D13 — the server resolves every item itself; nothing from the request's
  // own title/coverImage-shaped fields (there are none, Zod stripped them)
  // ever reaches the row that gets written.
  const resolution = await resolveAllItems(input.items, fetchImpl);
  if (!resolution.ok) {
    return { ok: false, reason: "resolve_failed" };
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = nanoid(SLUG_LENGTH);
    try {
      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(recommendation)
          .values({
            slug,
            caption: input.caption,
            comment: input.comment,
            userId,
          })
          .returning({ id: recommendation.id });

        await tx.insert(recommendationItem).values(
          input.items.map((item, index) => ({
            recommendationId: row!.id,
            position: index,
            provider: item.provider,
            externalId: item.externalId,
            mediaType: item.mediaType,
            title: resolution.resolved[index]!.title,
            coverImage: resolution.resolved[index]!.coverImage,
            scoreRaw: item.scoreRaw ?? null,
            scoreFormat: item.scoreFormat ?? null,
            comment: item.comment,
          })),
        );
      });

      return { ok: true, slug };
    } catch (error) {
      if (isSlugCollision(error) && attempt < MAX_SLUG_ATTEMPTS - 1) continue;
      throw error;
    }
  }

  // Unreachable — the loop above always returns or rethrows.
  throw new Error("Exhausted slug attempts without returning");
}

export type RecommendationView = {
  slug: string;
  caption: string | null;
  comment: string | null;
  views: number;
  createdAt: Date;
  items: {
    position: number;
    provider: string;
    externalId: number;
    mediaType: string;
    title: string;
    coverImage: string | null;
    scoreRaw: number | null;
    scoreFormat: string | null;
    comment: string | null;
  }[];
};

/**
 * Invariant 1, criterion 18a — every column selected explicitly. A
 * `select *` here is how a database id (or the owner's userId) leaks to
 * every anonymous reader of a shared link; there is no field named merely
 * "id" anywhere in the returned shape.
 */
export async function getRecommendationBySlug(slug: string): Promise<RecommendationView | null> {
  const [rec] = await db
    .select({
      slug: recommendation.slug,
      caption: recommendation.caption,
      comment: recommendation.comment,
      views: recommendation.views,
      createdAt: recommendation.createdAt,
    })
    .from(recommendation)
    .where(eq(recommendation.slug, slug))
    .limit(1);

  if (!rec) return null;

  const items = await db
    .select({
      position: recommendationItem.position,
      provider: recommendationItem.provider,
      externalId: recommendationItem.externalId,
      mediaType: recommendationItem.mediaType,
      title: recommendationItem.title,
      coverImage: recommendationItem.coverImage,
      scoreRaw: recommendationItem.scoreRaw,
      scoreFormat: recommendationItem.scoreFormat,
      comment: recommendationItem.comment,
    })
    .from(recommendationItem)
    .innerJoin(recommendation, eq(recommendationItem.recommendationId, recommendation.id))
    .where(eq(recommendation.slug, slug))
    .orderBy(recommendationItem.position);

  return { ...rec, items };
}

/**
 * Fire-and-forget from the page route only (PHASE-6.md) — never awaited by
 * the caller, so this swallows its own errors rather than letting a view-count
 * failure surface as a page error. Atomic `SET views = views + 1` rather than
 * read-modify-write avoids lost updates under concurrent hits on the same slug.
 */
export async function incrementViewCount(slug: string): Promise<void> {
  try {
    await db
      .update(recommendation)
      .set({ views: sql`${recommendation.views} + 1` })
      .where(eq(recommendation.slug, slug));
  } catch {
    // Swallowed by design — a lost view count is not worth a page failure.
  }
}
