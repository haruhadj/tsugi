import "server-only";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { auth } from "@/lib/auth";
import {
  COMMENT_SORTS,
  createCommentSchema,
  voteCommentSchema,
  type CommentSort,
} from "@/lib/validators/comment";
import { checkCommentLimit } from "@/server/hono/middleware";
import {
  createComment,
  deleteComment,
  listComments,
  toggleCommentVote,
} from "@/server/services/comments";

function isCommentSort(value: string): value is CommentSort {
  return (COMMENT_SORTS as readonly string[]).includes(value);
}

export const commentsRouter = new Hono()
  // Public — /r/[slug] is readable without an account (invariant 9), so its
  // discussion is too. The session is read only to mark the viewer's own votes
  // and their own comments, never to gate the read.
  .get("/lists/:slug/comments", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const sortParam = c.req.query("sort") ?? "top";
    const sort: CommentSort = isCommentSort(sortParam) ? sortParam : "top";

    const comments = await listComments(
      c.req.param("slug"),
      session?.user.id ?? null,
      sort,
    );
    if (comments === null) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json({ comments });
  })
  .post("/lists/:slug/comments", zValidator("json", createCommentSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to comment." }, 401);
    }

    const limit = await checkCommentLimit(session.user.id);
    if (!limit.allowed) {
      return c.json({ retryAfter: limit.retryAfterSeconds }, 429);
    }

    const result = await createComment(
      c.req.param("slug"),
      session.user.id,
      c.req.valid("json"),
    );

    if (result.status === "not_found") {
      return c.json({ error: "Not found" }, 404);
    }
    if (result.status === "invalid_parent") {
      return c.json({ error: "You can only reply to a top-level comment." }, 400);
    }
    if (result.status === "invalid_item") {
      return c.json({ error: "That title is not on this list." }, 400);
    }

    return c.json({ id: result.id }, 201);
  })
  .delete("/comments/:id", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to delete a comment." }, 401);
    }

    const result = await deleteComment(c.req.param("id"), session.user.id);
    if (result === "not_found") return c.json({ error: "Not found" }, 404);
    if (result === "forbidden") return c.json({ error: "Not yours to delete." }, 403);
    return c.body(null, 204);
  })
  .post("/comments/:id/vote", zValidator("json", voteCommentSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to vote." }, 401);
    }

    const limit = await checkCommentLimit(session.user.id);
    if (!limit.allowed) {
      return c.json({ retryAfter: limit.retryAfterSeconds }, 429);
    }

    const result = await toggleCommentVote(
      c.req.param("id"),
      session.user.id,
      c.req.valid("json").direction,
    );
    if (result.status === "not_found") {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json({ direction: result.direction });
  });
