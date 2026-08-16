import { describe, expect, test } from "bun:test";

// Live-database tier (D22) — see recs.db.test.ts for why this is .db.test.ts
// rather than a plain unit test: importing "./lists" pulls in "@/lib/auth",
// which calls getEnv() at module load and needs a full, valid env even for a
// request that never touches the database.
//
// Scope: boundary/validation cases only. Full success-path coverage
// (provider dispatch, score-format capture, token refresh, indefinite
// caching, ?refresh=1 forced refetch, and stale-cache fallback on a failed
// forced refresh) needs a real linked AniList/MAL account and is reserved
// for PHASE-7.md's criteria 1-8, not simulated here — the codebase has no
// session-forging helper, and Better-Auth signs session cookies, so a
// "valid session, invalid param" case (which would need one) is also
// deferred alongside those criteria.
const hasDb = Boolean(process.env.DATABASE_URL);

if (hasDb) {
  describe("listsRouter (in-process, via Hono's own .request())", () => {
    let listsRouter: (typeof import("./lists"))["listsRouter"];

    test("GET /lists/:provider/:mediaType with no session returns 401", async () => {
      ({ listsRouter } = await import("./lists"));
      const res = await listsRouter.request("/lists/anilist/anime");
      expect(res.status).toBe(401);
    });

    test("the 401 body never echoes any token field (invariant 10)", async () => {
      const res = await listsRouter.request("/lists/mal/manga");
      const body = await res.json();
      expect(JSON.stringify(body)).not.toContain("accessToken");
      expect(body).toHaveProperty("error");
    });

    test("?refresh=1 does not bypass the session check", async () => {
      const res = await listsRouter.request("/lists/anilist/anime?refresh=1");
      expect(res.status).toBe(401);
    });
  });
}
