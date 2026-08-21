import "server-only";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { list, listItem, listVote, listView } from "@/db/schema";
import type { ListCategory } from "@/lib/categories";
import type { CreateListInput, UpdateListInput } from "@/lib/validators/list";
import type { MediaType, ScoreFormat, UnifiedMediaResult } from "@/lib/types/media";
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

export type GenreCount = { name: string; count: number };

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
 * The genre cloud for a set of items, ranked by how many items carry each genre
 * and then alphabetically so the order is stable between renders. Mirrors the
 * prototype's `getListAggregatedGenres`.
 *
 * Computed in TypeScript rather than SQL because both callers have already
 * fetched the items — a second round-trip to `unnest` server-side would be a
 * query to re-derive data sitting in memory.
 */
export function aggregateGenres(items: { genres: string[] }[]): GenreCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const genre of item.genres) {
      const trimmed = genre.trim();
      if (trimmed) counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

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

  const { userId: _userId, ...rest } = row;
  return { ...rest, items, genres: aggregateGenres(items) };
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
    return { ...row, items: listItems, genres: aggregateGenres(listItems) };
  });
}

/**
 * Owner-checked metadata edit (Phase C; widened from rename-only by D48) — the
 * WHERE clause folds `userId` in directly since this has no need to distinguish
 * 403 from 404 the way delete does (PHASE-8.md criterion 6 is specific to
 * delete).
 *
 * Zod has already guaranteed at least one field is present, so the `set` object
 * can never be empty — an empty `set` is a Drizzle runtime error, not a no-op.
 */
export type UpdateListResult = "updated" | "not_found";

export async function updateList(
  slug: string,
  userId: string,
  input: UpdateListInput,
): Promise<UpdateListResult> {
  const result = await db
    .update(list)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
    })
    .where(and(eq(list.slug, slug), eq(list.userId, userId)))
    .returning({ id: list.id });

  return result.length > 0 ? "updated" : "not_found";
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

export type DashboardStats = {
  listCount: number;
  publishedCount: number;
  totalViews: number;
  totalItems: number;
  /** Net vote score across the owner's published lists — upvotes minus downvotes. */
  totalScore: number;
};

/**
 * The dashboard's four headline numbers, aggregated in the database rather than by
 * summing listListsForUser's rows in the page: votes are not on ListView at all, and
 * item counts would otherwise be right only because that query happens to fetch every
 * item of every list.
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [row] = await db
    .select({
      listCount: sql<number>`count(*)::int`,
      publishedCount: sql<number>`count(*) filter (where ${list.published})::int`,
      totalViews: sql<number>`coalesce(sum(${list.views}), 0)::int`,
      totalItems: sql<number>`coalesce(sum((
        select count(*) from ${listItem} where ${listItem.listId} = ${list.id}
      )), 0)::int`,
      totalScore: sql<number>`coalesce(sum((
        select coalesce(sum(${listVote.direction}), 0)
        from ${listVote} where ${listVote.listId} = ${list.id}
      )), 0)::int`,
    })
    .from(list)
    .where(eq(list.userId, userId));

  return (
    row ?? {
      listCount: 0,
      publishedCount: 0,
      totalViews: 0,
      totalItems: 0,
      totalScore: 0,
    }
  );
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

export const FEED_SORTS = ["top", "new", "views", "items"] as const;
export type FeedSort = (typeof FEED_SORTS)[number];

export type FeedCover = {
  coverImage: string | null;
  title: string;
  // Kept as the `(raw, format)` pair the rest of the product passes around, so
  // an imported 87/100 still badges as 87/100 (D47) rather than being coerced.
  scoreRaw: number | null;
  scoreFormat: ScoreFormat | null;
};

export type FeedEntry = {
  slug: string;
  name: string;
  category: string;
  caption: string | null;
  views: number;
  publishedAt: Date | null;
  createdAt: Date;
  score: number;
  itemCount: number;
  /** Rendered as `u/{username}` (D49). Null for lists whose author predates
   *  mandatory handles and has not signed in since — those show no author line. */
  authorUsername: string | null;
  /** The first few titles, for the feed's filmstrip. Carries the title and score
   *  as well as the art so each cover can be labelled and badged rather than
   *  rendered as decoration; `coverImage` stays nullable so a list whose lead
   *  title has no art still shows its placeholder in order. */
  covers: FeedCover[];
  /** The row's genre chips, aggregated from its items. Capped — a feed row has
   *  no room for the full cloud, and the artifact page shows all of them. */
  genres: string[];
};

/** Genre chips per feed row. The rest are on /r/[slug], which has the room. */
const FEED_GENRE_COUNT = 3;

/** How many covers each feed row carries. Enough to fill the filmstrip, no more. */
const FEED_COVER_COUNT = 10;

/**
 * Everything the rundown can be narrowed by. One type, because the row query and
 * all three sidebar count queries have to agree on it — a sidebar that counts a
 * different population than the list beneath it is worse than no counts at all.
 */
export type FeedFilters = {
  // The fixed vocabulary, not a free string — the route narrows an unknown
  // `?category=` to undefined before it reaches here (D48).
  category?: ListCategory;
  genre?: string;
  mediaType?: MediaType;
  /** Already trimmed and floored at 2 characters by the caller. */
  q?: string;
};

/**
 * `%` and `_` are wildcards inside ILIKE, so a user searching for "100%" would
 * otherwise match everything after "100". `\` escapes them, and itself first.
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * The one place the feed's WHERE is built. Four callers need it — the row query
 * and the three facet counts — and each of the facet queries drops its *own*
 * dimension (see `omit`), which is only safe to express once.
 *
 * Both item-level filters are correlated `EXISTS` subqueries rather than joins,
 * for the reason `itemCountExpr` documents: joining `list_item` multiplies
 * against the `list_vote` leftJoin and corrupts every aggregate in the select.
 */
function feedWhere(filters: FeedFilters) {
  const { category, genre, mediaType, q } = filters;
  const pattern = q ? `%${escapeLike(q)}%` : null;

  return and(
    eq(list.published, true),
    category ? eq(list.category, category) : undefined,
    genre
      ? sql`exists (
          select 1 from ${listItem}
          where ${listItem.listId} = ${list.id} and ${genre} = any(${listItem.genres})
        )`
      : undefined,
    mediaType
      ? sql`exists (
          select 1 from ${listItem}
          where ${listItem.listId} = ${list.id} and ${listItem.mediaType} = ${mediaType}
        )`
      : undefined,
    // Everything a reader can see on a feed row is searchable, plus the item
    // titles behind it — "the list with Frieren in it" is how people look for a
    // list they have read before, and the row itself never names its items.
    pattern
      ? sql`(
          ${list.name} ilike ${pattern} escape '\\'
          or ${list.caption} ilike ${pattern} escape '\\'
          or ${list.category}::text ilike ${pattern} escape '\\'
          or ${user.username} ilike ${pattern} escape '\\'
          or exists (
            select 1 from ${listItem}
            where ${listItem.listId} = ${list.id}
              and ${listItem.title} ilike ${pattern} escape '\\'
          )
        )`
      : undefined,
  );
}

/**
 * Public, published-only (D42) — no `userId` in the selected columns
 * (invariant 1). Score is a live `SUM(direction)` aggregate, not a
 * denormalized counter (Phase C decision: correctness over an extra write
 * on every vote, revisit only if this proves too slow at scale).
 */
export async function listPublishedFeed(
  params: FeedFilters & {
    page: number;
    pageSize: number;
    sort: FeedSort;
  },
): Promise<FeedEntry[]> {
  const { page, pageSize, sort, ...filters } = params;
  /*
    Every aggregate here is cast to int. Postgres returns count() as bigint and sum()
    as numeric, both of which postgres.js hands back as *strings* to avoid precision
    loss — so without the cast these arrive typed `number` but valued "3", and every
    `=== 1` comparison downstream silently fails.
  */
  const scoreExpr = sql<number>`coalesce(sum(${listVote.direction}), 0)::int`;
  /*
    Counted as a correlated subquery rather than a second leftJoin: joining both
    list_vote and list_item against list multiplies their rows together, and every
    aggregate over that product is then wrong (a list with 3 votes and 4 items would
    report 12 of each).
  */
  const itemCountExpr = sql<number>`(
    select count(*)::int from ${listItem} where ${listItem.listId} = ${list.id}
  )`;
  const whereExpr = feedWhere(filters);

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
      category: list.category,
      caption: list.caption,
      views: list.views,
      publishedAt: list.publishedAt,
      createdAt: list.createdAt,
      score: scoreExpr,
      itemCount: itemCountExpr,
      authorUsername: user.username,
    })
    .from(list)
    .leftJoin(listVote, eq(listVote.listId, list.id))
    // Inner join on a NOT NULL FK — one author row per list, so this cannot
    // drop or duplicate a row the way the list_vote/list_item pairing would.
    // Grouped by user.id as well as list.id: `username` is not functionally
    // dependent on list.id as far as Postgres is concerned.
    .innerJoin(user, eq(list.userId, user.id))
    .where(whereExpr)
    .groupBy(list.id, user.id)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (rows.length === 0) return [];

  const slugs = rows.map((row) => row.slug);
  const coverRows = await db
    .select({
      slug: list.slug,
      position: listItem.position,
      coverImage: listItem.coverImage,
      title: listItem.title,
      scoreRaw: listItem.scoreRaw,
      scoreFormat: listItem.scoreFormat,
    })
    .from(listItem)
    .innerJoin(list, eq(listItem.listId, list.id))
    // `position` is the 0-based array index assigned in createList, so the first
    // FEED_COVER_COUNT items are 0..COUNT-1 — `lt`, not `lte`.
    .where(and(inArray(list.slug, slugs), lt(listItem.position, FEED_COVER_COUNT)))
    .orderBy(listItem.position);

  const coversBySlug = new Map<string, FeedCover[]>();
  for (const { slug, position: _position, ...cover } of coverRows) {
    const bucket = coversBySlug.get(slug);
    if (bucket) {
      bucket.push(cover);
    } else {
      coversBySlug.set(slug, [cover]);
    }
  }

  /*
    Genres are read over *every* item of the listed lists, not just the first
    FEED_COVER_COUNT — a row's chips should describe the whole list, and the
    lead titles are not a representative sample of it. Separate from the cover
    query for that reason, rather than widening that one's WHERE.
  */
  const genreRows = await db
    .select({ slug: list.slug, genres: listItem.genres })
    .from(listItem)
    .innerJoin(list, eq(listItem.listId, list.id))
    .where(inArray(list.slug, slugs));

  const genreItemsBySlug = new Map<string, { genres: string[] }[]>();
  for (const row of genreRows) {
    const bucket = genreItemsBySlug.get(row.slug);
    if (bucket) {
      bucket.push({ genres: row.genres });
    } else {
      genreItemsBySlug.set(row.slug, [{ genres: row.genres }]);
    }
  }

  return rows.map((row) => ({
    ...row,
    covers: coversBySlug.get(row.slug) ?? [],
    genres: aggregateGenres(genreItemsBySlug.get(row.slug) ?? [])
      .slice(0, FEED_GENRE_COUNT)
      .map((genre) => genre.name),
  }));
}

/**
 * The categories actually in use across published lists, most-used first, for
 * the rundown's directory.
 *
 * Since D48 this groups `list.category` — a fixed vocabulary — rather than the
 * free-text `name` it used to. Only categories with at least one published list
 * are returned: the directory is "where there is something to read", not a
 * table of contents with nineteen empty rows. The 20 cap is now larger than the
 * vocabulary itself and kept only so this can never blow out the sidebar.
 */
export type FeedCategory = { name: string; count: number };

/**
 * Every facet query below drops its *own* dimension from the filters before
 * counting. Counting categories under an active category filter would collapse
 * the directory to the one row already selected, and the panel would stop being
 * a way to move sideways — which is the only thing it is for.
 */
export async function listFeedCategories(filters: FeedFilters = {}): Promise<FeedCategory[]> {
  const rows = await db
    .select({ name: list.category, count: sql<number>`count(*)::int` })
    .from(list)
    // Joined even when nothing searches on it: `feedWhere` reaches for
    // `user.username`, so the column has to be in scope for every caller.
    .innerJoin(user, eq(list.userId, user.id))
    .where(feedWhere({ ...filters, category: undefined }))
    .groupBy(list.category)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  return rows;
}

/**
 * Counts for the format panel. `all` is counted separately rather than summed
 * from the other two — a list holding both anime and manga belongs to both, so
 * adding them would over-count it.
 */
export type FeedMediaTypeCounts = { all: number; anime: number; manga: number };

export async function listFeedMediaTypeCounts(
  filters: FeedFilters = {},
): Promise<FeedMediaTypeCounts> {
  const base = { ...filters, mediaType: undefined };

  const countFor = async (mediaType: MediaType | undefined) => {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(list)
      .innerJoin(user, eq(list.userId, user.id))
      .where(feedWhere({ ...base, mediaType }));
    return row?.count ?? 0;
  };

  const [all, anime, manga] = await Promise.all([
    countFor(undefined),
    countFor("anime"),
    countFor("manga"),
  ]);

  return { all, anime, manga };
}

/**
 * Every published list, unfiltered. Deliberately not derived from the category
 * facet's counts: those respect the reader's active filters, and the one place
 * this is used — the sidebar's call to action — is quoting a fact about the
 * product rather than about the current view.
 */
export async function countPublishedLists(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(list)
    .where(eq(list.published, true));
  return row?.count ?? 0;
}

/**
 * The genre directory beside the category one — how many published lists carry
 * each genre on at least one of their items.
 *
 * `count(distinct list.id)`, not `count(*)`: a list with four Fantasy titles is
 * one Fantasy list, and counting rows would rank a single long list above ten
 * short ones. Unnesting in a lateral join keeps this to one query over the GIN
 * index rather than a read-all-then-aggregate in TypeScript, which is what the
 * per-row aggregation above does — this one spans the whole table.
 */
export async function listFeedGenres(filters: FeedFilters = {}): Promise<FeedCategory[]> {
  const rows = await db.execute<{ name: string; count: number }>(sql`
    select genre as name, count(distinct ${list.id})::int as count
    from ${list}
    join ${user} on ${list.userId} = ${user.id}
    join ${listItem} on ${listItem.listId} = ${list.id}
    cross join lateral unnest(${listItem.genres}) as genre
    where ${feedWhere({ ...filters, genre: undefined })}
    group by genre
    order by count desc, genre asc
    limit 20
  `);

  return [...rows];
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
