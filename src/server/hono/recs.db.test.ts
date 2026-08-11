import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

// Live-database tier (D22) — named .db.test.ts rather than a plain unit test
// because importing "./recs" pulls in "@/lib/auth", which calls getEnv() at
// module load and needs a full, valid env even for a request that never
// touches the database (a 401 with no session cookie resolves before any
// query runs). Gating on hasDb alone is enough locally, since .env supplies
// every var together; see auth.db.test.ts for the same reasoning.
const hasDb = Boolean(process.env.DATABASE_URL);

if (hasDb) {
  describe("recsRouter (in-process, via Hono's own .request())", () => {
    let recsRouter: (typeof import("./recs"))["recsRouter"];
    let db: (typeof import("@/db"))["db"];
    let user: (typeof import("@/db/auth-schema"))["user"];
    let recommendation: (typeof import("@/db/schema"))["recommendation"];
    let createRecommendation: (typeof import("@/server/services/recommendations"))["createRecommendation"];

    const testUserId = `test-user-${crypto.randomUUID()}`;

    beforeAll(async () => {
      ({ recsRouter } = await import("./recs"));
      ({ db } = await import("@/db"));
      ({ user } = await import("@/db/auth-schema"));
      ({ recommendation } = await import("@/db/schema"));
      ({ createRecommendation } = await import("@/server/services/recommendations"));

      await db.insert(user).values({
        id: testUserId,
        name: "Recs Route Test User",
        email: `${testUserId}@users.tsugi.invalid`,
      });
    });

    afterAll(async () => {
      await db.delete(recommendation).where(eq(recommendation.userId, testUserId));
      await db.delete(user).where(eq(user.id, testUserId));
    });

    // Criterion 1 — the boundary check, not just the schema. A valid body
    // with no session cookie at all.
    test("POST /recs with no session returns 401", async () => {
      const res = await recsRouter.request("/recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: "hi",
          items: [{ provider: "anilist", externalId: 154587, mediaType: "anime" }],
        }),
      });
      expect(res.status).toBe(401);
    });

    // The 400 half of the same boundary — invalid body, still no session.
    // Confirms validation runs and produces a real HTTP 400, not just that
    // the Zod schema itself rejects the shape (already proven in rec.test.ts).
    test("POST /recs with an invalid body returns 400", async () => {
      const res = await recsRouter.request("/recs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      });
      expect(res.status).toBe(400);
    });

    // Criterion 18.
    test("GET /recs/:slug for an unknown slug returns 404 with a JSON body", async () => {
      const res = await recsRouter.request("/recs/aaaaaaaaaaaa");
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    // Criterion 3 (HTTP half) / 18a (HTTP half) — a real request through the
    // full route, not just the service function directly.
    test("GET /recs/:slug for a real recommendation returns 200 with no session required and no ids", async () => {
      const created = await createRecommendation(
        testUserId,
        { comment: "hono http test", items: [{ provider: "anilist", externalId: 154587, mediaType: "anime" }] },
        // Real AniList call is fine here — this is the one HTTP-layer test
        // allowed to hit it, since it only runs once and confirms the whole
        // stack end to end with the actual documented Frieren fixture.
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      try {
        const res = await recsRouter.request(`/recs/${created.slug}`);
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body).not.toHaveProperty("id");
        expect(body).not.toHaveProperty("userId");
        expect((body.items as { title: string }[])[0]?.title).toBe(
          "Frieren: Beyond Journey’s End",
        );
      } finally {
        await db.delete(recommendation).where(eq(recommendation.slug, created.slug));
      }
    });
  });
}
