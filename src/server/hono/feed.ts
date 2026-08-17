import "server-only";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "@/db";
import { list } from "@/db/schema";
import { auth } from "@/lib/auth";
import { checkVoteLimit } from "@/server/hono/middleware";
import { listPublishedFeed, toggleVote, type FeedSort } from "@/server/services/lists";

function isFeedSort(value: string): value is FeedSort {
  return value === "top" || value === "new";
}

function isVoteDirection(value: unknown): value is 1 | -1 {
  return value === 1 || value === -1;
}

export const feedRouter = new Hono()
  .get("/feed", async (c) => {
    const sortParam = c.req.query("sort") ?? "top";
    const sort = isFeedSort(sortParam) ? sortParam : "top";
    const pageParam = Number(c.req.query("page") ?? "1");
    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

    const entries = await listPublishedFeed({ page, pageSize: 20, sort });
    return c.json({ entries });
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
