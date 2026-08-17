import "server-only";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { updateUsernameSchema } from "@/lib/validators/username";
import { checkUsernameUpdateLimit } from "@/server/hono/middleware";
import { updateUsername } from "@/server/services/users";

export const userRouter = new Hono().patch(
  "/user/username",
  zValidator("json", updateUsernameSchema),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Sign in to change your username." }, 401);
    }

    const limit = await checkUsernameUpdateLimit(session.user.id);
    if (!limit.allowed) {
      return c.json({ retryAfter: limit.retryAfterSeconds }, 429);
    }

    const { username } = c.req.valid("json");
    const result = await updateUsername(session.user.id, username);
    if (result === "taken") {
      return c.json({ error: "That username is already taken." }, 409);
    }
    return c.json({ username });
  },
);
