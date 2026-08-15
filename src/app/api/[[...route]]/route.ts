import { Hono } from "hono";
import { handle } from "hono/vercel";
import { auth } from "@/lib/auth";
import { listsRouter } from "@/server/hono/lists";
import { recsRouter } from "@/server/hono/recs";

// The only Hono instance in the project (architecture.md) — Better-Auth
// mounts inside it (D6) so there is no second Next route under /api and no
// precedence question to reason about. Phase 4 adds /api/recs to this same
// app, not a new one.
const app = new Hono().basePath("/api");

app.on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw));
app.route("/", recsRouter);
app.route("/", listsRouter);

export const GET = handle(app);
export const POST = handle(app);
