import "server-only";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { createListSchema, editListSchema } from "@/lib/validators/list";
import { checkListCreateLimit } from "@/server/hono/middleware";
import {
  createList,
  deleteList,
  duplicateList,
  editList,
  getListBySlug,
  listListsForUser,
  publishList,
  unpublishList,
} from "@/server/services/lists";

export const userListsRouter = new Hono()
  .post("/lists", zValidator("json", createListSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to create a list." }, 401);
    }

    const limit = await checkListCreateLimit(session.user.id);
    if (!limit.allowed) {
      return c.json({ retryAfter: limit.retryAfterSeconds }, 429);
    }

    const input = c.req.valid("json");
    const result = await createList(session.user.id, input, fetch);

    if (!result.ok) {
      return c.json(
        { error: "Could not resolve one or more titles. Nothing was saved." },
        502,
      );
    }

    return c.json({ slug: result.slug }, 201);
  })
  .get("/lists", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to view your lists." }, 401);
    }
    const lists = await listListsForUser(session.user.id);
    return c.json({ lists });
  })
  .get("/lists/:slug", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const list = await getListBySlug(c.req.param("slug"), session?.user.id ?? null);
    if (!list) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json(list);
  })
  /*
    A full edit (D59) — metadata and the whole item set in one body. It shares
    the *create* limiter rather than getting one of its own: an edit can add
    titles, which costs the same provider resolution a create does, and rewrites
    every item row either way. Five a minute is far above any human editing pace
    and well below a useful way to hammer AniList.
  */
  .patch("/lists/:slug", zValidator("json", editListSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to edit a list." }, 401);
    }

    const limit = await checkListCreateLimit(session.user.id);
    if (!limit.allowed) {
      return c.json({ retryAfter: limit.retryAfterSeconds }, 429);
    }

    const result = await editList(
      c.req.param("slug"),
      session.user.id,
      c.req.valid("json"),
      fetch,
    );

    if (!result.ok) {
      if (result.reason === "not_found") {
        return c.json({ error: "Not found" }, 404);
      }
      return c.json(
        { error: "Could not resolve one or more titles. Nothing was changed." },
        502,
      );
    }
    return c.body(null, 204);
  })
  .post("/lists/:slug/publish", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to publish a list." }, 401);
    }

    const result = await publishList(c.req.param("slug"), session.user.id);
    if (result === "not_found") {
      return c.json({ error: "Not found" }, 404);
    }
    return c.body(null, 204);
  })
  .post("/lists/:slug/duplicate", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to duplicate a list." }, 401);
    }

    // A duplicate writes a whole list plus its items, so it costs the same as a
    // create and shares its limiter rather than being unmetered.
    const limit = await checkListCreateLimit(session.user.id);
    if (!limit.allowed) {
      return c.json({ retryAfter: limit.retryAfterSeconds }, 429);
    }

    const result = await duplicateList(c.req.param("slug"), session.user.id);
    if (result.status === "not_found") {
      return c.json({ error: "Not found" }, 404);
    }
    if (result.status === "forbidden") {
      return c.json({ error: "Not yours to duplicate." }, 403);
    }

    return c.json({ slug: result.slug }, 201);
  })
  .post("/lists/:slug/unpublish", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to unpublish a list." }, 401);
    }

    const result = await unpublishList(c.req.param("slug"), session.user.id);
    if (result === "not_found") {
      return c.json({ error: "Not found" }, 404);
    }
    return c.body(null, 204);
  })
  .delete("/lists/:slug", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to delete a list." }, 401);
    }

    const result = await deleteList(c.req.param("slug"), session.user.id);
    if (result === "not_found") {
      return c.json({ error: "Not found" }, 404);
    }
    if (result === "forbidden") {
      return c.json({ error: "You can only delete your own lists." }, 403);
    }
    return c.body(null, 204);
  });
