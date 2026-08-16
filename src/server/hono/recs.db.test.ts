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
    let recommendationItem: (typeof import("@/db/schema"))["recommendationItem"];
    let createRecommendation: (typeof import("@/server/services/recommendations"))["createRecommendation"];

    const testUserId = `test-user-${crypto.randomUUID()}`;
    // A second real user, needed to exercise session-scoping (criterion 1)
    // and the ownership 403 (criterion 6) — a single user can't produce
    // either case on its own.
    const otherUserId = `test-user-${crypto.randomUUID()}`;

    // Auth-mocking seam: `auth.api.getSession` is called by every /recs
    // route from the actual `auth` singleton, which needs a real Better-Auth
    // session cookie to resolve — impossible to fabricate here without a
    // browser (see createRecommendation's own doc comment). Routes only ever
    // consume the return value's `user.id`, so temporarily monkey-patching
    // `getSession` to return a fixed fake session for the duration of a
    // single request is the narrowest way to exercise session-scoped routes
    // in-process. Restored immediately after each request that uses it.
    async function requestAs(
      userId: string | null,
      path: string,
      init?: RequestInit,
    ): Promise<Response> {
      const { auth } = await import("@/lib/auth");
      const original = auth.api.getSession;
      auth.api.getSession = (async () =>
        userId === null
          ? null
          : {
              session: { id: "fake", userId, token: "fake" },
              user: { id: userId },
            }) as typeof auth.api.getSession;
      try {
        return await recsRouter.request(path, init);
      } finally {
        auth.api.getSession = original;
      }
    }

    beforeAll(async () => {
      ({ recsRouter } = await import("./recs"));
      ({ db } = await import("@/db"));
      ({ user } = await import("@/db/auth-schema"));
      ({ recommendation, recommendationItem } = await import("@/db/schema"));
      ({ createRecommendation } = await import("@/server/services/recommendations"));

      await db.insert(user).values([
        {
          id: testUserId,
          name: "Recs Route Test User",
          email: `${testUserId}@users.tsugi.invalid`,
        },
        {
          id: otherUserId,
          name: "Recs Route Test User (Other)",
          email: `${otherUserId}@users.tsugi.invalid`,
        },
      ]);
    });

    afterAll(async () => {
      await db.delete(recommendation).where(eq(recommendation.userId, testUserId));
      await db.delete(recommendation).where(eq(recommendation.userId, otherUserId));
      await db.delete(user).where(eq(user.id, testUserId));
      await db.delete(user).where(eq(user.id, otherUserId));
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

    // Seeds a rec directly rather than through createRecommendation, so
    // GET/DELETE list and ownership tests don't depend on a real AniList
    // call each time.
    async function seedRec(ownerId: string, slug: string): Promise<void> {
      const [row] = await db
        .insert(recommendation)
        .values({ slug, caption: "seeded", comment: "seeded", userId: ownerId })
        .returning({ id: recommendation.id });
      await db.insert(recommendationItem).values({
        recommendationId: row!.id,
        position: 0,
        provider: "anilist",
        externalId: 1,
        mediaType: "anime",
        title: "Seed Title",
        coverImage: null,
        scoreRaw: null,
        scoreFormat: null,
        comment: null,
      });
    }

    // Criterion 1 — the boundary check for the list route too.
    test("GET /recs with no session returns 401", async () => {
      const res = await requestAs(null, "/recs");
      expect(res.status).toBe(401);
    });

    // Criterion 1 — session-scoped, newest first, and no leakage of another
    // user's recs into the list.
    test("GET /recs returns only the session user's own recs, newest first", async () => {
      const slugA = `sda${crypto.randomUUID().slice(0, 8)}`;
      const slugB = `sdb${crypto.randomUUID().slice(0, 8)}`;
      const slugOther = `sdo${crypto.randomUUID().slice(0, 8)}`;
      await seedRec(testUserId, slugA);
      await seedRec(testUserId, slugB);
      await seedRec(otherUserId, slugOther);

      try {
        const res = await requestAs(testUserId, "/recs");
        expect(res.status).toBe(200);
        const body = (await res.json()) as { recs: { slug: string }[] };
        const slugs = body.recs.map((r) => r.slug);
        expect(slugs).toContain(slugA);
        expect(slugs).toContain(slugB);
        expect(slugs.indexOf(slugB)).toBeLessThan(slugs.indexOf(slugA));
        expect(slugs.every((s) => s !== undefined)).toBe(true);
        expect(slugs).not.toContain(slugOther);
      } finally {
        await db
          .delete(recommendation)
          .where(eq(recommendation.userId, testUserId));
      }
    });

    // Criterion 1 half of the boundary for delete too.
    test("DELETE /recs/:slug with no session returns 401", async () => {
      const res = await requestAs(null, "/recs/aaaaaaaaaaaa", { method: "DELETE" });
      expect(res.status).toBe(401);
    });

    test("DELETE /recs/:slug for an unknown slug returns 404", async () => {
      const res = await requestAs(testUserId, "/recs/aaaaaaaaaaaa", { method: "DELETE" });
      expect(res.status).toBe(404);
    });

    // Criterion 6 — a slug that exists but belongs to someone else is 403,
    // distinct from 404, and the row must still be there afterward.
    test("DELETE /recs/:slug for someone else's rec returns 403 and leaves it intact", async () => {
      const slug = `sdo${crypto.randomUUID().slice(0, 8)}`;
      await seedRec(otherUserId, slug);

      try {
        const res = await requestAs(testUserId, `/recs/${slug}`, { method: "DELETE" });
        expect(res.status).toBe(403);

        const [still] = await db
          .select({ slug: recommendation.slug })
          .from(recommendation)
          .where(eq(recommendation.slug, slug))
          .limit(1);
        expect(still?.slug).toBe(slug);
      } finally {
        await db.delete(recommendation).where(eq(recommendation.slug, slug));
      }
    });

    // Criterion 7 — a successful delete removes the row, and the slug is
    // gone for good (never reissued): a follow-up GET is 404.
    test("DELETE /recs/:slug for your own rec returns 204 and the slug never comes back", async () => {
      const slug = `sdw${crypto.randomUUID().slice(0, 8)}`;
      await seedRec(testUserId, slug);

      const res = await requestAs(testUserId, `/recs/${slug}`, { method: "DELETE" });
      expect(res.status).toBe(204);

      const [gone] = await db
        .select({ slug: recommendation.slug })
        .from(recommendation)
        .where(eq(recommendation.slug, slug))
        .limit(1);
      expect(gone).toBeUndefined();

      const refetch = await recsRouter.request(`/recs/${slug}`);
      expect(refetch.status).toBe(404);
    });
  });
}
