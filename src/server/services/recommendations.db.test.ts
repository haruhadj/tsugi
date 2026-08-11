import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";

// Live-database tier (D22), same plain-`if` pattern as schema.db.test.ts —
// "./recommendations" transitively imports "server-only" via "@/db", which
// throws under a plain Bun require without --conditions=react-server.
// Also needs Upstash (the cache is not optional in this module), so this
// tier is gated on both rather than db alone.
const hasDb = Boolean(process.env.DATABASE_URL);
const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

function randomSlugLike(): string {
  return Math.random().toString(36).slice(2, 12);
}

/**
 * A tiny fake AniList + Jikan backend, keyed by a made-up externalId range
 * (900000+) chosen specifically so it can never collide with a real title —
 * these tests must never depend on, or accidentally warm the cache for, a
 * real (provider, mediaType, externalId).
 */
const TITLES: Record<number, string> = {
  900001: "Test Title One",
  900002: "Test Title Two",
  900003: "Test Title Three",
  900004: "Test Title Four",
  900005: "Test Title Five",
  900006: "Test Title Six",
  900007: "Test Title Seven",
  900008: "Test Title Eight",
  900009: "Test Title Nine",
  900010: "Test Title Ten",
};
const MAL_ONLY_ID = 52991; // stands in for Frieren's real MAL id, criterion 6
const WRONG_SPACE_ID = 154587; // an AniList id, deliberately queried against MAL, criterion 7

function anilistResolveBody(id: number) {
  if (!(id in TITLES)) {
    return { status: 404, body: { errors: [{ message: "Not Found.", status: 404 }], data: { Media: null } } };
  }
  return {
    status: 200,
    body: {
      data: {
        Media: {
          id,
          type: "ANIME",
          title: { english: TITLES[id], romaji: TITLES[id], native: TITLES[id] },
          coverImage: { extraLarge: `https://s4.anilist.co/fake/${id}.jpg`, large: null },
          startDate: { year: 2020 },
          averageScore: 80,
        },
      },
    },
  };
}

function jikanResolveBody(id: number) {
  if (id === MAL_ONLY_ID) {
    return {
      status: 200,
      body: {
        data: {
          mal_id: id,
          title: "Frieren (fake MAL entry)",
          title_english: "Frieren (fake MAL entry)",
          title_japanese: null,
          images: { jpg: { large_image_url: "https://cdn.myanimelist.net/fake.jpg" } },
          year: 2023,
          score: 9.1,
        },
      },
    };
  }
  return { status: 404, body: { status: 404, type: "BadResponseException", message: "not found", error: null } };
}

type MockOptions = {
  /** externalId (AniList) that hangs forever instead of responding — for the deadline test. */
  hangId?: number;
  onCallStart?: () => void;
  onCallEnd?: () => void;
};

function buildMockFetch(options: MockOptions = {}) {
  let totalCalls = 0;
  let activeCalls = 0;
  let maxActiveCalls = 0;

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    totalCalls += 1;
    activeCalls += 1;
    maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
    options.onCallStart?.();

    try {
      const url = String(input);

      if (url.includes("graphql.anilist.co")) {
        const parsed = JSON.parse(String(init?.body)) as { variables: { id: number } };
        const id = parsed.variables.id;

        if (options.hangId !== undefined && id === options.hangId) {
          return await new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const error = new Error("The operation was aborted");
              error.name = "AbortError";
              reject(error);
            });
          });
        }

        const { status, body } = anilistResolveBody(id);
        return new Response(JSON.stringify(body), { status });
      }

      if (url.includes("api.jikan.moe")) {
        const id = Number(url.split("/").pop());
        const { status, body } = jikanResolveBody(id);
        return new Response(JSON.stringify(body), { status });
      }

      throw new Error(`buildMockFetch: unexpected URL ${url}`);
    } finally {
      activeCalls -= 1;
      options.onCallEnd?.();
    }
  }) as typeof fetch;

  return {
    fetchImpl,
    totalCalls: () => totalCalls,
    maxActiveCalls: () => maxActiveCalls,
  };
}

if (hasDb && hasUpstash) {
  describe("createRecommendation / getRecommendationBySlug (live Supabase + Upstash)", () => {
    let db: (typeof import("@/db"))["db"];
    let user: (typeof import("@/db/auth-schema"))["user"];
    let recommendation: (typeof import("@/db/schema"))["recommendation"];
    let recommendationItem: (typeof import("@/db/schema"))["recommendationItem"];
    let createRecommendation: (typeof import("./recommendations"))["createRecommendation"];
    let getRecommendationBySlug: (typeof import("./recommendations"))["getRecommendationBySlug"];

    const testUserId = `test-user-${randomSlugLike()}`;
    const createdSlugs: string[] = [];

    beforeAll(async () => {
      ({ db } = await import("@/db"));
      ({ user } = await import("@/db/auth-schema"));
      ({ recommendation, recommendationItem } = await import("@/db/schema"));
      ({ createRecommendation, getRecommendationBySlug } = await import("./recommendations"));

      await db.insert(user).values({
        id: testUserId,
        name: "Recommendations Test User",
        email: `${testUserId}@users.tsugi.invalid`,
      });
    });

    afterAll(async () => {
      if (createdSlugs.length > 0) {
        await db.delete(recommendation).where(inArray(recommendation.slug, createdSlugs));
      }
      await db.delete(user).where(eq(user.id, testUserId));

      // Cache entries for the fake ids would otherwise sit in Upstash for a
      // full 24h TTL — harmless, but noisy for the next run.
      const { Redis } = await import("@upstash/redis");
      const redis = Redis.fromEnv();
      const keys = [...Object.keys(TITLES), String(MAL_ONLY_ID), String(WRONG_SPACE_ID)].map(
        (id) => `tsugi:media:anilist:anime:${id}`,
      );
      keys.push(`tsugi:media:mal:anime:${MAL_ONLY_ID}`, `tsugi:media:mal:anime:${WRONG_SPACE_ID}`);
      await Promise.all(keys.map((key) => redis.del(key)));
    });

    function track(slug: string) {
      createdSlugs.push(slug);
      return slug;
    }

    // Criterion 2.
    test("a one-item recommendation returns a slug matching the required shape", async () => {
      const { fetchImpl } = buildMockFetch();
      const result = await createRecommendation(
        testUserId,
        { items: [{ provider: "anilist", externalId: 900001, mediaType: "anime", scoreRaw: 9, scoreFormat: "POINT_10" }] },
        fetchImpl,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      track(result.slug);
      expect(result.slug).toMatch(/^[A-Za-z0-9_-]{12}$/);
    });

    // Criterion 3 — the stored title is the resolved one, and the read is public.
    test("the read returns the server-resolved title, not anything client-supplied", async () => {
      const { fetchImpl } = buildMockFetch();
      const created = await createRecommendation(
        testUserId,
        { comment: "hi", items: [{ provider: "anilist", externalId: 900002, mediaType: "anime" }] },
        fetchImpl,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      track(created.slug);

      const read = await getRecommendationBySlug(created.slug);
      expect(read?.items[0]?.title).toBe("Test Title Two");
    });

    // Criterion 4 — position order preserved on read.
    test("a three-item recommendation reads back in position order", async () => {
      const { fetchImpl } = buildMockFetch();
      const created = await createRecommendation(
        testUserId,
        {
          items: [
            { provider: "anilist", externalId: 900003, mediaType: "anime", comment: "third" },
            { provider: "anilist", externalId: 900001, mediaType: "anime", comment: "first" },
            { provider: "anilist", externalId: 900002, mediaType: "anime", comment: "second" },
          ],
        },
        fetchImpl,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      track(created.slug);

      const read = await getRecommendationBySlug(created.slug);
      expect(read?.items.map((i) => i.position)).toEqual([0, 1, 2]);
      expect(read?.items.map((i) => i.title)).toEqual([
        "Test Title Three",
        "Test Title One",
        "Test Title Two",
      ]);
    });

    // Criterion 5 — mixed providers in one group, each keeping its own provider.
    test("a group mixing anilist and mal items succeeds, each item keeping its provider", async () => {
      const { fetchImpl } = buildMockFetch();
      const created = await createRecommendation(
        testUserId,
        {
          items: [
            { provider: "anilist", externalId: 900001, mediaType: "anime", comment: "a" },
            { provider: "mal", externalId: MAL_ONLY_ID, mediaType: "anime", comment: "b" },
          ],
        },
        fetchImpl,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      track(created.slug);

      const read = await getRecommendationBySlug(created.slug);
      expect(read?.items.map((i) => i.provider)).toEqual(["anilist", "mal"]);
    });

    // Criterion 6 — the same show through a different id space.
    test("mal externalId 52991 resolves and stores fine", async () => {
      const { fetchImpl } = buildMockFetch();
      const created = await createRecommendation(
        testUserId,
        { comment: "frieren via mal", items: [{ provider: "mal", externalId: MAL_ONLY_ID, mediaType: "anime" }] },
        fetchImpl,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      track(created.slug);
    });

    // Criterion 7 — D15's core guarantee, at the create-flow level.
    test("mal externalId 154587 (an AniList id) does not store Frieren — it 502s", async () => {
      const { fetchImpl } = buildMockFetch();
      const result = await createRecommendation(
        testUserId,
        { comment: "wrong id space", items: [{ provider: "mal", externalId: WRONG_SPACE_ID, mediaType: "anime" }] },
        fetchImpl,
      );
      expect(result.ok).toBe(false);
    });

    // Criterion 19 — the transaction criterion: force item 3 of 3 to fail,
    // confirm the DB gained zero new rows in either table.
    test("a failure on the third of three items writes nothing", async () => {
      const before = await db.select().from(recommendation).where(eq(recommendation.userId, testUserId));
      const { fetchImpl } = buildMockFetch();

      const result = await createRecommendation(
        testUserId,
        {
          items: [
            { provider: "anilist", externalId: 900001, mediaType: "anime", comment: "ok" },
            { provider: "anilist", externalId: 900002, mediaType: "anime", comment: "ok" },
            { provider: "mal", externalId: WRONG_SPACE_ID, mediaType: "anime", comment: "fails" },
          ],
        },
        fetchImpl,
      );
      expect(result.ok).toBe(false);

      const after = await db.select().from(recommendation).where(eq(recommendation.userId, testUserId));
      expect(after.length).toBe(before.length);
    });

    // Criterion 20.
    test("two identical POSTs produce two different slugs", async () => {
      const input = {
        comment: "same content twice",
        items: [{ provider: "anilist" as const, externalId: 900004, mediaType: "anime" as const }],
      };
      const first = await createRecommendation(testUserId, input, buildMockFetch().fetchImpl);
      const second = await createRecommendation(testUserId, input, buildMockFetch().fetchImpl);
      expect(first.ok && second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      track(first.slug);
      track(second.slug);
      expect(first.slug).not.toBe(second.slug);
    });

    // Criterion 12 — no normalisation, the exact rated value survives storage.
    test("scoreRaw: 87 with POINT_100 stores 87, not a normalised 9", async () => {
      const { fetchImpl } = buildMockFetch();
      const created = await createRecommendation(
        testUserId,
        {
          items: [
            { provider: "anilist", externalId: 900005, mediaType: "anime", scoreRaw: 87, scoreFormat: "POINT_100" },
          ],
        },
        fetchImpl,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      track(created.slug);

      const read = await getRecommendationBySlug(created.slug);
      expect(read?.items[0]?.scoreRaw).toBe(87);
      expect(read?.items[0]?.scoreFormat).toBe("POINT_100");
    });

    // Criterion 18a — the read shape leaks no database id anywhere.
    test("the read response contains no id field on the group or on any item", async () => {
      const { fetchImpl } = buildMockFetch();
      const created = await createRecommendation(
        testUserId,
        { comment: "no ids please", items: [{ provider: "anilist", externalId: 900006, mediaType: "anime" }] },
        fetchImpl,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      track(created.slug);

      const read = await getRecommendationBySlug(created.slug);
      const json = JSON.parse(JSON.stringify(read)) as Record<string, unknown>;
      expect(json).not.toHaveProperty("id");
      expect(json).not.toHaveProperty("userId");
      for (const item of read?.items ?? []) {
        expect(item as object).not.toHaveProperty("id");
        expect(item as object).not.toHaveProperty("recommendationId");
      }
    });

    // Criterion 21 / 22 — cache hit does not call the provider; a different
    // provider for the same externalId does.
    test("a second resolve of the same (provider, externalId) hits the cache; a different provider does not", async () => {
      const first = buildMockFetch();
      await createRecommendation(
        testUserId,
        { comment: "cache warm", items: [{ provider: "anilist", externalId: 900007, mediaType: "anime" }] },
        first.fetchImpl,
      ).then((r) => r.ok && track(r.slug));
      expect(first.totalCalls()).toBe(1);

      // Criterion 21 — same provider, same id: no call at all.
      const second = buildMockFetch();
      await createRecommendation(
        testUserId,
        { comment: "cache hit expected", items: [{ provider: "anilist", externalId: 900007, mediaType: "anime" }] },
        second.fetchImpl,
      ).then((r) => r.ok && track(r.slug));
      expect(second.totalCalls()).toBe(0);

      // Criterion 22 — same externalId, other provider: must call through,
      // proving the cache key is not missing its provider prefix. This
      // particular mal id has no fixture (only MAL_ONLY_ID does), so the
      // call resolves to a 404 and the group fails — irrelevant here; what
      // matters is that a call was attempted at all, not its outcome.
      const third = buildMockFetch();
      await createRecommendation(
        testUserId,
        { comment: "different provider, must miss", items: [{ provider: "mal", externalId: 900007, mediaType: "anime" }] },
        third.fetchImpl,
      );
      expect(third.totalCalls()).toBe(1);
    });

    // Criterion 14b.
    test("a 10-item group resolves at most 4 provider calls concurrently", async () => {
      const { fetchImpl, maxActiveCalls } = buildMockFetch();
      const items = Object.keys(TITLES).map((id) => ({
        provider: "anilist" as const,
        externalId: Number(id),
        mediaType: "anime" as const,
        comment: "x",
      }));

      const result = await createRecommendation(testUserId, { items }, fetchImpl);
      expect(result.ok).toBe(true);
      if (result.ok) track(result.slug);
      expect(maxActiveCalls()).toBeLessThanOrEqual(4);
    });

    // Criterion 14c — every call hangs; the whole request still settles
    // within ~8s (the deadline) and writes nothing.
    test(
      "with every provider call forced to hang, a 10-item group fails within ~8s and writes nothing",
      async () => {
        const before = await db
          .select()
          .from(recommendation)
          .where(eq(recommendation.userId, testUserId));

        // hangId set to every id via a wildcard is not supported by the mock,
        // so this uses a dedicated fetch that always hangs regardless of id.
        const alwaysHangs = (async (_input: RequestInfo | URL, init?: RequestInit) => {
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const error = new Error("The operation was aborted");
              error.name = "AbortError";
              reject(error);
            });
          });
        }) as typeof fetch;

        const items = Array.from({ length: 10 }, (_, i) => ({
          provider: "anilist" as const,
          externalId: 800000 + i, // outside TITLES on purpose — never cached from an earlier test
          mediaType: "anime" as const,
          comment: "x",
        }));

        const start = performance.now();
        const result = await createRecommendation(testUserId, { items }, alwaysHangs);
        const elapsed = performance.now() - start;

        expect(result.ok).toBe(false);
        expect(elapsed).toBeLessThan(9_000);

        const after = await db
          .select()
          .from(recommendation)
          .where(eq(recommendation.userId, testUserId));
        expect(after.length).toBe(before.length);
      },
      10_000,
    );
  });
}
