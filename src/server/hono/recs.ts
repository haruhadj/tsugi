import "server-only";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { createRecSchema } from "@/lib/validators/rec";
import { checkRecCreateLimit } from "@/server/hono/middleware";
import {
  createRecommendation,
  deleteRecommendation,
  getRecommendationBySlug,
  listRecommendationsForUser,
} from "@/server/services/recommendations";

export const recsRouter = new Hono()
  .post("/recs", zValidator("json", createRecSchema), async (c) => {
    // D23/criterion 1 — session before rate limit. An unauthenticated
    // request has no rate-limit key and must never consume one.
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to create a recommendation." }, 401);
    }

    const limit = await checkRecCreateLimit(session.user.id);
    if (!limit.allowed) {
      return c.json({ retryAfter: limit.retryAfterSeconds }, 429);
    }

    const input = c.req.valid("json");
    const result = await createRecommendation(session.user.id, input);

    if (!result.ok) {
      return c.json(
        { error: "Could not resolve one or more titles. Nothing was saved." },
        502,
      );
    }

    return c.json({ slug: result.slug }, 201);
  })
  .get("/recs", async (c) => {
    // PHASE-8.md criterion 1 — session-scoped, not a query param, so a
    // signed-in user can never pass someone else's userId in.
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to view your recommendations." }, 401);
    }
    const recs = await listRecommendationsForUser(session.user.id);
    return c.json({ recs });
  })
  .get("/recs/:slug", async (c) => {
    const rec = await getRecommendationBySlug(c.req.param("slug"));
    if (!rec) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json(rec);
  })
  .delete("/recs/:slug", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to delete a recommendation." }, 401);
    }

    const result = await deleteRecommendation(c.req.param("slug"), session.user.id);
    if (result === "not_found") {
      return c.json({ error: "Not found" }, 404);
    }
    if (result === "forbidden") {
      return c.json({ error: "You can only delete your own recommendations." }, 403);
    }
    return c.body(null, 204);
  });
