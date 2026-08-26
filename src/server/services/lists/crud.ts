import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { list, listItem, listVote, listView } from "@/db/schema";
import type { CreateListInput, EditListInput } from "@/lib/validators/list";
import type { UnifiedMediaResult } from "@/lib/types/media";
import { resolveMediaCached } from "@/server/services/media-cache";
import { aggregateGenres, type GenreCount } from "@/server/services/lists/stats";

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
  { ok: true; slug: string } | { ok: false; reason: "resolve_failed" };

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
            category: input.category,
            caption: input.caption,
            comment: input.comment,
            userId,
            // Publishing happens in the same transaction as the insert (D48).
            // The alternative — create, then a second POST to /publish — can
            // fail between the two and leave a list the author believes is
            // live sitting as a draft. No `coalesce` on publishedAt as in
            // publishList: this row did not exist a moment ago, so this is
            // always the first publish.
            published: input.publish ?? false,
            publishedAt: input.publish ? sql`now()` : null,
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
            // Resolved server-side with the title and cover (D13) — the
            // client's genre list is never trusted, same as everything else here.
            genres: resolution.resolved[index]!.genres,
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
  category: string;
  caption: string | null;
  comment: string | null;
  views: number;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  /**
   * The author's chosen handle, rendered as `u/{username}` (D49). Null only for
   * lists published before handles became mandatory, whose owner has not signed
   * in since — those render no author line rather than an invented one.
   */
  authorUsername: string | null;
  /**
   * Whether the caller owns this list — derived from the `viewerId` that was
   * passed in, so it is a fact about *this* read rather than about the row
   * (**D59**). It is what gates the edit affordance on `/r/[slug]`; invariant 1
   * is untouched, since a boolean is not an identifier.
   */
  isOwner: boolean;
  /** Net vote score, summed live from `list_vote` — the same number the feed row shows. */
  score: number;
  /**
   * The signed-in reader's own vote on this list, so the arrows come back lit after
   * a refresh or on another device. 0 for signed-out readers.
   */
  myDirection: 1 | -1 | 0;
  /**
   * The list's genre cloud, aggregated from its items at read time rather than
   * stored on the list — a stored copy is a second source of truth that drifts
   * the first time an item is added. Frequency-ranked, most common first.
   */
  genres: GenreCount[];
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
    genres: string[];
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
  genres: listItem.genres,
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
      category: list.category,
      caption: list.caption,
      comment: list.comment,
      views: list.views,
      published: list.published,
      publishedAt: list.publishedAt,
      createdAt: list.createdAt,
      userId: list.userId,
      authorUsername: user.username,
      /*
        Correlated subqueries rather than a leftJoin on list_vote: this select is
        a single row and a join would have forced a GROUP BY over every column.
        Cast to int for the reason listPublishedFeed documents — sum() comes back
        from postgres.js as a string otherwise, and `=== 1` then silently fails.
      */
      score: sql<number>`(
        select coalesce(sum(${listVote.direction}), 0)::int
        from ${listVote} where ${listVote.listId} = ${list.id}
      )`,
      myDirection: viewerId
        ? sql<1 | -1 | 0>`(
            select coalesce(max(${listVote.direction}), 0)::int
            from ${listVote}
            where ${listVote.listId} = ${list.id} and ${listVote.userId} = ${viewerId}
          )`
        : sql<1 | -1 | 0>`0::int`,
    })
    .from(list)
    // Inner rather than left: `list.userId` is NOT NULL and references
    // `user.id`, so every list has exactly one author row — the join cannot
    // drop a list or duplicate one. `user.username` itself may still be null.
    .innerJoin(user, eq(list.userId, user.id))
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

  const { userId, ...rest } = row;
  return {
    ...rest,
    isOwner: viewerId !== null && userId === viewerId,
    items,
    genres: aggregateGenres(items),
  };
}

/**
 * Fire-and-forget from the page route only (PHASE-6.md) — never awaited by
 * the caller, so this swallows its own errors rather than letting a view-count
 * failure surface as a page error. Atomic `SET views = views + 1` rather than
 * read-modify-write avoids lost updates under concurrent hits on the same slug.
 *
 * Only logged-in views count (anonymous views are never counted). `userId`
 * dedups against `listView`, a durable per-(list,user) record — the view
 * only counts if that insert actually lands a new row, so repeat visits from
 * any device or browser session never double-count.
 */
export async function incrementViewCount(slug: string, userId: string): Promise<void> {
  try {
    const [row] = await db.select({ id: list.id }).from(list).where(eq(list.slug, slug));
    if (!row) return;

    const inserted = await db
      .insert(listView)
      .values({ listId: row.id, userId })
      .onConflictDoNothing()
      .returning({ id: listView.id });
    if (inserted.length === 0) return;

    await db
      .update(list)
      .set({ views: sql`${list.views} + 1` })
      .where(eq(list.id, row.id));
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
      category: list.category,
      caption: list.caption,
      comment: list.comment,
      views: list.views,
      published: list.published,
      publishedAt: list.publishedAt,
      createdAt: list.createdAt,
      // Deliberately not joined to `user` here: every row belongs to the
      // caller, so the author is already known and a join would be a
      // per-row lookup of a value the page has in its own session.
      authorUsername: sql<string | null>`null`,
      score: sql<number>`(
        select coalesce(sum(${listVote.direction}), 0)::int
        from ${listVote} where ${listVote.listId} = ${list.id}
      )`,
      // The caller owns every row here, and an author's own vote on their own
      // list is not something the dashboard shows — so this is a constant rather
      // than a second correlated read.
      myDirection: sql<1 | -1 | 0>`0::int`,
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

  return rows.map((row) => {
    const listItems = itemsBySlug.get(row.slug) ?? [];
    // Every row here was selected by `userId` — the caller owns all of them.
    return { ...row, isOwner: true, items: listItems, genres: aggregateGenres(listItems) };
  });
}

/**
 * The edit route's read (**D59**). `getListBySlug` would happily return someone
 * else's *published* list — right for the artifact page, wrong for an editor,
 * which must show a list only to the person allowed to change it. Owning the
 * ownership check here rather than in the page keeps it out of reach of a
 * future caller that forgets to apply it.
 */
export async function getOwnedListBySlug(
  slug: string,
  userId: string,
): Promise<ListView | null> {
  const view = await getListBySlug(slug, userId);
  return view?.isOwner ? view : null;
}

/**
 * Identity of a stored item, per invariant 2 — the triple, never the id alone.
 * Used to decide which items in an edit are already resolved and which are new.
 */
function itemKey(item: { provider: string; mediaType: string; externalId: number }): string {
  return `${item.provider}:${item.mediaType}:${item.externalId}`;
}

export type EditListResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "resolve_failed" };

/**
 * A full owner-checked edit of an existing list (**D59**) — metadata plus the
 * whole item set, including additions, removals, reordering, and score/note
 * changes. Replaced the metadata-only `updateList` (name + category, D48).
 *
 * Two things worth knowing before changing this:
 *
 * **Only genuinely new titles are re-resolved.** An item already stored under
 * the same `(provider, mediaType, externalId)` keeps its resolved title, cover
 * and genres rather than being fetched again — reordering a list or fixing a
 * typo in a note must not be able to fail because AniList is down, and a second
 * resolution of the same id yields the same answer anyway. D13 still holds for
 * the items that *are* new: nothing title-shaped from the request is trusted.
 *
 * **The item set is replaced, not merged.** Delete-then-insert inside one
 * transaction, rather than diffing: `position_per_list` is a unique constraint,
 * so shuffling positions in place would collide mid-update against rows that
 * have not moved yet. The delete clears the field first.
 *
 * The ownership check folds `userId` into the lookup and answers `not_found`
 * for someone else's list, matching `updateList` before it — PHASE-8.md's
 * 403-not-404 criterion is specific to delete.
 */
export async function editList(
  slug: string,
  userId: string,
  input: EditListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<EditListResult> {
  const [existing] = await db
    .select({ id: list.id })
    .from(list)
    .where(and(eq(list.slug, slug), eq(list.userId, userId)))
    .limit(1);

  if (!existing) return { ok: false, reason: "not_found" };

  const storedItems = await db
    .select(itemColumns)
    .from(listItem)
    .where(eq(listItem.listId, existing.id));

  type Resolved = { title: string; coverImage: string | null; genres: string[] };
  const resolvedByKey = new Map<string, Resolved>(
    storedItems.map((item) => [
      itemKey(item),
      { title: item.title, coverImage: item.coverImage, genres: item.genres },
    ]),
  );

  const newItems = input.items.filter((item) => !resolvedByKey.has(itemKey(item)));
  if (newItems.length > 0) {
    const resolution = await resolveAllItems(newItems, fetchImpl);
    if (!resolution.ok) return { ok: false, reason: "resolve_failed" };
    newItems.forEach((item, index) => {
      const resolved = resolution.resolved[index]!;
      resolvedByKey.set(itemKey(item), {
        title: resolved.title,
        coverImage: resolved.coverImage,
        genres: resolved.genres,
      });
    });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(list)
      .set({
        name: input.name,
        category: input.category,
        // `?? null`, not a spread-if-present: an edit is a whole-list
        // replacement, so an absent caption means the author cleared it.
        caption: input.caption ?? null,
        comment: input.comment ?? null,
      })
      .where(eq(list.id, existing.id));

    await tx.delete(listItem).where(eq(listItem.listId, existing.id));

    await tx.insert(listItem).values(
      input.items.map((item, index) => {
        const resolved = resolvedByKey.get(itemKey(item))!;
        return {
          listId: existing.id,
          position: index,
          provider: item.provider,
          externalId: item.externalId,
          mediaType: item.mediaType,
          title: resolved.title,
          coverImage: resolved.coverImage,
          genres: resolved.genres,
          scoreRaw: item.scoreRaw ?? null,
          scoreFormat: item.scoreFormat ?? null,
          comment: item.comment ?? null,
        };
      }),
    );
  });

  return { ok: true };
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
    .set({
      published: true,
      publishedAt: sql`coalesce(${list.publishedAt}, now())`,
    })
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

export type DuplicateListResult =
  { status: "duplicated"; slug: string } | { status: "not_found" } | { status: "forbidden" };

/**
 * Clones a list and its items as a fresh draft owned by the same user.
 *
 * The copy always starts unpublished with its counters reset: views and votes belong
 * to the original's history, and silently carrying them over would let anyone mint a
 * list that looks popular by duplicating one that is. Items are copied straight from
 * the stored rows rather than re-resolved against the providers — they were resolved
 * server-side when the original was created, so a second round of network calls would
 * add failure modes for no new information.
 */
export async function duplicateList(
  slug: string,
  userId: string,
): Promise<DuplicateListResult> {
  const [existing] = await db
    .select({
      id: list.id,
      userId: list.userId,
      name: list.name,
      category: list.category,
      caption: list.caption,
      comment: list.comment,
    })
    .from(list)
    .where(eq(list.slug, slug))
    .limit(1);

  if (!existing) return { status: "not_found" };
  if (existing.userId !== userId) return { status: "forbidden" };

  const sourceItems = await db
    .select(itemColumns)
    .from(listItem)
    .where(eq(listItem.listId, existing.id))
    .orderBy(listItem.position);

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const newSlug = nanoid(SLUG_LENGTH);
    try {
      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(list)
          .values({
            slug: newSlug,
            name: existing.name,
            category: existing.category,
            caption: existing.caption,
            comment: existing.comment,
            userId,
          })
          .returning({ id: list.id });

        if (sourceItems.length > 0) {
          await tx
            .insert(listItem)
            .values(sourceItems.map((item) => ({ ...item, listId: created!.id })));
        }
      });

      return { status: "duplicated", slug: newSlug };
    } catch (error) {
      if (isSlugCollision(error) && attempt < MAX_SLUG_ATTEMPTS - 1) continue;
      throw error;
    }
  }

  // Unreachable — the loop above always returns or rethrows.
  throw new Error("Exhausted slug attempts without returning");
}
