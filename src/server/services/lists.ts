import "server-only";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { list, listComment, listItem, listVote } from "@/db/schema";
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
async function resolveAllItems(
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
function isSlugCollision(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; constraint_name?: string } } | undefined)
    ?.cause;
  return cause?.code === "23505" && cause?.constraint_name === "list_slug_unique";
}

export type CreateListResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "resolve_failed" };

/**
 * The create flow's core, independent of HTTP, session, and rate limiting —
 * those are the Hono route's job (`src/server/hono/userLists.ts`), which
 * calls this only once a session and a validated body both exist. Takes a
 * plain `userId` rather than a session object so it can be exercised
 * directly against a real Postgres test user, without needing a real signed
 * session cookie.
 */
export async function createList(
  userId: string,
  input: CreateListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CreateListResult> {
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
          .insert(list)
          .values({
            slug,
            name: input.name,
            caption: input.caption,
            comment: input.comment,
            userId,
          })
          .returning({ id: list.id });

        await tx.insert(listItem).values(
          input.items.map((item, index) => ({
            listId: row!.id,
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

export type ListView = {
  slug: string;
  name: string;
  caption: string | null;
  comment: string | null;
  views: number;
  published: boolean;
  publishedAt: Date | null;
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

const itemColumns = {
  position: listItem.position,
  provider: listItem.provider,
  externalId: listItem.externalId,
  mediaType: listItem.mediaType,
  title: listItem.title,
  coverImage: listItem.coverImage,
  scoreRaw: listItem.scoreRaw,
  scoreFormat: listItem.scoreFormat,
  comment: listItem.comment,
};

/**
 * Invariant 1, criterion 18a — every column selected explicitly. A
 * `select *` here is how a database id (or the owner's userId) leaks to
 * every anonymous reader of a shared link; there is no field named merely
 * "id" anywhere in the returned shape.
 *
 * Unpublished lists are owner-only (D42): a caller passing a `viewerId` that
 * does not match the list's owner sees the same `null` as a nonexistent
 * slug, so `/r/[slug]` cannot distinguish "draft" from "never existed" for
 * anyone but the owner.
 */
export async function getListBySlug(
  slug: string,
  viewerId: string | null,
): Promise<ListView | null> {
  const [row] = await db
    .select({
      slug: list.slug,
      name: list.name,
      caption: list.caption,
      comment: list.comment,
      views: list.views,
      published: list.published,
      publishedAt: list.publishedAt,
      createdAt: list.createdAt,
      userId: list.userId,
    })
    .from(list)
    .where(eq(list.slug, slug))
    .limit(1);

  if (!row) return null;
  if (!row.published && row.userId !== viewerId) return null;

  const items = await db
    .select(itemColumns)
    .from(listItem)
    .innerJoin(list, eq(listItem.listId, list.id))
    .where(eq(list.slug, slug))
    .orderBy(listItem.position);

  const { userId: _userId, ...rest } = row;
  return { ...rest, items };
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
      .update(list)
      .set({ views: sql`${list.views} + 1` })
      .where(eq(list.slug, slug));
  } catch {
    // Swallowed by design — a lost view count is not worth a page failure.
  }
}

/**
 * PHASE-8.md criterion 1: dashboard scope is `userId`, not eyeballing. Same
 * explicit-column shape as `getListBySlug` (invariant 1) — no bare "id" or
 * `userId` leaves this function either, even though the caller already
 * knows whose lists these are. Includes both draft and published lists
 * (D42) — the dashboard is where a user manages the publish state.
 */
export async function listListsForUser(userId: string): Promise<ListView[]> {
  const rows = await db
    .select({
      slug: list.slug,
      name: list.name,
      caption: list.caption,
      comment: list.comment,
      views: list.views,
      published: list.published,
      publishedAt: list.publishedAt,
      createdAt: list.createdAt,
    })
    .from(list)
    .where(eq(list.userId, userId))
    .orderBy(desc(list.createdAt));

  if (rows.length === 0) return [];

  const items = await db
    .select({ slug: list.slug, ...itemColumns })
    .from(listItem)
    .innerJoin(list, eq(listItem.listId, list.id))
    .where(eq(list.userId, userId))
    .orderBy(listItem.position);

  const itemsBySlug = new Map<string, ListView["items"]>();
  for (const { slug, ...item } of items) {
    const bucket = itemsBySlug.get(slug);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsBySlug.set(slug, [item]);
    }
  }

  return rows.map((row) => ({ ...row, items: itemsBySlug.get(row.slug) ?? [] }));
}

/**
 * Owner-checked rename (Phase C) — the WHERE clause folds `userId` in
 * directly since a rename has no need to distinguish 403 from 404 the way
 * delete does (PHASE-8.md criterion 6 is specific to delete).
 */
export type RenameListResult = "renamed" | "not_found";

export async function renameList(
  slug: string,
  userId: string,
  name: string,
): Promise<RenameListResult> {
  const result = await db
    .update(list)
    .set({ name })
    .where(and(eq(list.slug, slug), eq(list.userId, userId)))
    .returning({ id: list.id });

  return result.length > 0 ? "renamed" : "not_found";
}

export type PublishListResult = "updated" | "not_found";

/**
 * `publishedAt` is set only on the transition into published — re-publishing
 * an already-published list, or unpublishing, never touches it, so a list's
 * first-publish timestamp survives repeated publish/unpublish cycles.
 */
export async function publishList(slug: string, userId: string): Promise<PublishListResult> {
  const result = await db
    .update(list)
    .set({ published: true, publishedAt: sql`coalesce(${list.publishedAt}, now())` })
    .where(and(eq(list.slug, slug), eq(list.userId, userId)))
    .returning({ id: list.id });

  return result.length > 0 ? "updated" : "not_found";
}

export async function unpublishList(slug: string, userId: string): Promise<PublishListResult> {
  const result = await db
    .update(list)
    .set({ published: false })
    .where(and(eq(list.slug, slug), eq(list.userId, userId)))
    .returning({ id: list.id });

  return result.length > 0 ? "updated" : "not_found";
}

export type DeleteListResult = "deleted" | "not_found" | "forbidden";

/**
 * PHASE-8.md: "deleting is immediate and total" — the DB's own
 * `onDelete: "cascade"` on `listItem.listId` (and `listVote.listId`) removes
 * the items and votes, so this is a single statement. The ownership check is
 * a separate read rather than folding `userId` into the delete's WHERE
 * clause, so a slug that exists but belongs to someone else can be told
 * apart from a slug that never existed (criterion 6: 403 vs 404).
 */
export async function deleteList(slug: string, userId: string): Promise<DeleteListResult> {
  const [existing] = await db
    .select({ userId: list.userId })
    .from(list)
    .where(eq(list.slug, slug))
    .limit(1);

  if (!existing) return "not_found";
  if (existing.userId !== userId) return "forbidden";

  await db.delete(list).where(and(eq(list.slug, slug), eq(list.userId, userId)));

  return "deleted";
}

export const FEED_SORTS = ["top", "new", "views", "items"] as const;
export type FeedSort = (typeof FEED_SORTS)[number];

export type FeedEntry = {
  slug: string;
  name: string;
  caption: string | null;
  views: number;
  publishedAt: Date | null;
  createdAt: Date;
  score: number;
  itemCount: number;
  commentCount: number;
  /** Cover art for the first few titles, for the feed's filmstrip. Nulls are kept
   *  so a list whose lead title has no art still shows its placeholder in order. */
  covers: (string | null)[];
};

/** How many covers each feed row carries. Enough to fill the filmstrip, no more. */
const FEED_COVER_COUNT = 5;

/**
 * Public, published-only (D42) — no `userId` in the selected columns
 * (invariant 1). Score is a live `SUM(direction)` aggregate, not a
 * denormalized counter (Phase C decision: correctness over an extra write
 * on every vote, revisit only if this proves too slow at scale).
 */
export async function listPublishedFeed(params: {
  page: number;
  pageSize: number;
  sort: FeedSort;
  category?: string;
}): Promise<FeedEntry[]> {
  const { page, pageSize, sort, category } = params;
  const scoreExpr = sql<number>`coalesce(sum(${listVote.direction}), 0)`;
  /*
    Counted as a correlated subquery rather than a second leftJoin: joining both
    list_vote and list_item against list multiplies their rows together, and every
    aggregate over that product is then wrong (a list with 3 votes and 4 items would
    report 12 of each).
  */
  const itemCountExpr = sql<number>`(
    select count(*) from ${listItem} where ${listItem.listId} = ${list.id}
  )`;
  const commentCountExpr = sql<number>`(
    select count(*) from ${listComment} where ${listComment.listId} = ${list.id}
  )`;
  const whereExpr = category
    ? and(eq(list.published, true), eq(list.name, category))
    : eq(list.published, true);

  const orderBy = {
    top: desc(scoreExpr),
    new: desc(list.publishedAt),
    views: desc(list.views),
    items: desc(itemCountExpr),
  }[sort];

  const rows = await db
    .select({
      slug: list.slug,
      name: list.name,
      caption: list.caption,
      views: list.views,
      publishedAt: list.publishedAt,
      createdAt: list.createdAt,
      score: scoreExpr,
      itemCount: itemCountExpr,
      commentCount: commentCountExpr,
    })
    .from(list)
    .leftJoin(listVote, eq(listVote.listId, list.id))
    .where(whereExpr)
    .groupBy(list.id)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (rows.length === 0) return [];

  const slugs = rows.map((row) => row.slug);
  const coverRows = await db
    .select({ slug: list.slug, position: listItem.position, coverImage: listItem.coverImage })
    .from(listItem)
    .innerJoin(list, eq(listItem.listId, list.id))
    // `position` is the 0-based array index assigned in createList, so the first
    // FEED_COVER_COUNT items are 0..COUNT-1 — `lt`, not `lte`.
    .where(and(inArray(list.slug, slugs), lt(listItem.position, FEED_COVER_COUNT)))
    .orderBy(listItem.position);

  const coversBySlug = new Map<string, (string | null)[]>();
  for (const row of coverRows) {
    const bucket = coversBySlug.get(row.slug);
    if (bucket) {
      bucket.push(row.coverImage);
    } else {
      coversBySlug.set(row.slug, [row.coverImage]);
    }
  }

  return rows.map((row) => ({ ...row, covers: coversBySlug.get(row.slug) ?? [] }));
}

/**
 * Distinct `list.name` values across published lists, most-used first, for
 * the feed's category chip list. `name` is free-text (D42) — this is not a
 * fixed taxonomy, just what's actually in use right now. Capped at 20 chips
 * so a long tail of one-off names can't blow out the header UI.
 */
export type FeedCategory = { name: string; count: number };

export async function listFeedCategories(): Promise<FeedCategory[]> {
  const rows = await db
    .select({ name: list.name, count: sql<number>`count(*)::int` })
    .from(list)
    .where(eq(list.published, true))
    .groupBy(list.name)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  return rows;
}

export type ToggleVoteResult = { direction: 1 | -1 | 0 };

/**
 * Upsert-or-remove: same direction re-clicked deletes the vote (un-vote);
 * opposite direction flips it in place; no existing vote inserts one. All
 * three cases run inside one transaction so a concurrent second click from
 * the same user can't race the read-then-write.
 */
export async function toggleVote(
  listId: string,
  userId: string,
  direction: 1 | -1,
): Promise<ToggleVoteResult> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ direction: listVote.direction })
      .from(listVote)
      .where(and(eq(listVote.listId, listId), eq(listVote.userId, userId)))
      .limit(1);

    if (!existing) {
      await tx.insert(listVote).values({ listId, userId, direction });
      return { direction };
    }

    if (existing.direction === direction) {
      await tx
        .delete(listVote)
        .where(and(eq(listVote.listId, listId), eq(listVote.userId, userId)));
      return { direction: 0 };
    }

    await tx
      .update(listVote)
      .set({ direction })
      .where(and(eq(listVote.listId, listId), eq(listVote.userId, userId)));
    return { direction };
  });
}
