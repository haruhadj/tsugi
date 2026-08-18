import { Hono } from "hono";
import { handle } from "hono/vercel";
import { auth } from "@/lib/auth";
import { feedRouter } from "@/server/hono/feed";
import { trackerListsRouter } from "@/server/hono/trackerLists";
import { userListsRouter } from "@/server/hono/userLists";
import { userRouter } from "@/server/hono/user";

// The only Hono instance in the project (architecture.md) — Better-Auth
// mounts inside it (D6) so there is no second Next route under /api and no
// precedence question to reason about.
const app = new Hono().basePath("/api");

app.on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw));
app.route("/", trackerListsRouter);
app.route("/", userListsRouter);
app.route("/", feedRouter);
app.route("/", userRouter);

/*
  Every verb the routers actually implement has to be re-exported here: Next only
  dispatches to a route handler whose HTTP method it finds as a named export, so a
  missing one is a 405 that no amount of correct Hono routing can rescue. PATCH and
  DELETE were absent, which silently broke delete-list, rename-list, and
  username-update. Adding a verb to a router means adding it here too.
*/
export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
