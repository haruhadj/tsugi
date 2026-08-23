import "server-only";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "@/db";
import { list } from "@/db/schema";
import { auth } from "@/lib/auth";
import { checkVoteLimit } from "@/server/hono/middleware";
import { isListCategory } from "@/lib/categories";
import { FEED_PAGE_SIZE, normalizeFeedQuery, normalizeMediaType } from "@/lib/feed-params";
import {
  FEED_SORTS,
  listFeedCategories,
  listFeedGenres,
  listFeedMediaTypeCounts,
  listPublishedFeed,
  toggleVote,
  type FeedFilters,
  type FeedSort,
} from "@/server/services/lists";

function isFeedSort(value: string): value is FeedSort {
  return (FEED_SORTS as readonly string[]).includes(value);
}

function isVoteDirection(value: unknown): value is 1 | -1 {
  return value === 1 || value === -1;
}

/**
 * Shared by all four read routes so the row query and the facet counts can never
 * disagree about what is being filtered. See `lib/feed-params.ts` for why an
 * unknown value falls back to unfiltered rather than 400'ing.
 */
function filtersFrom(c: { req: { query: (key: string) => string | undefined } }): FeedFilters {
  // An unknown category is dropped rather than 400'd, the same way an unknown
  // sort falls back to "top": a stale chip in someone's bookmark should show
  // the whole rundown, not an error page. Since D48 the vocabulary is fixed, so
  // this can be checked rather than passed through.
  const categoryParam = c.req.query("category");
  return {
    category: categoryParam && isListCategory(categoryParam) ? categoryParam : undefined,
    // Genres come from the providers, not from us, so there is no list to
    // validate against — an unmatched genre simply returns nothing.
    genre: c.req.query("genre") || undefined,
    mediaType: normalizeMediaType(c.req.query("mediaType")),
    q: normalizeFeedQuery(c.req.query("q")),
  };
}

export const feedRouter = new Hono()
  .get("/feed", async (c) => {
    const sortParam = c.req.query("sort") ?? "top";
    const sort = isFeedSort(sortParam) ? sortParam : "top";
    const pageParam = Number(c.req.query("page") ?? "1");
    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

    const entries = await listPublishedFeed({
      page,
      pageSize: FEED_PAGE_SIZE,
      sort,
      ...filtersFrom(c),
    });
    return c.json({ entries });
  })
  .get("/feed/categories", async (c) => {
    const categories = await listFeedCategories(filtersFrom(c));
    return c.json({ categories });
  })
  .get("/feed/genres", async (c) => {
    const genres = await listFeedGenres(filtersFrom(c));
    return c.json({ genres });
  })
  .get("/feed/media-types", async (c) => {
    const counts = await listFeedMediaTypeCounts(filtersFrom(c));
    return c.json({ counts });
  })
  .post("/feed/:slug/vote", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to vote." }, 401);
    }

    const limit = await checkVoteLimit(session.user.id);
    if (!limit.allowed) {
      return c.json({ retryAfter: limit.retryAfterSeconds }, 429);
    }

    const body = await c.req.json().catch(() => null);
    const direction = body && "direction" in body ? body.direction : undefined;
    if (!isVoteDirection(direction)) {
      return c.json({ error: "direction must be 1 or -1." }, 400);
    }

    // D42 — only published lists are votable; explicit `published` check
    // here rather than trusting the slug alone.
    const [row] = await db
      .select({ id: list.id })
      .from(list)
      .where(and(eq(list.slug, c.req.param("slug")), eq(list.published, true)))
      .limit(1);
    if (!row) {
      return c.json({ error: "Not found" }, 404);
    }

    const result = await toggleVote(row.id, session.user.id, direction);
    return c.json(result);
  });
