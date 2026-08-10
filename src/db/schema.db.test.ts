import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { asc, eq, inArray, sql } from "drizzle-orm";

// Live-database tests skip themselves when there is nothing to connect to
// (D22) — CI has no DATABASE_URL, so this tier never runs there. Run it
// locally before every deploy; it is what proves the RLS guarantees hold.
//
// This is a plain `if` around the describe() call below, not `describe.skip`
// — verified that Bun's describe.skip still executes the block's
// beforeAll/afterAll, it only skips the test() bodies. That matters here
// because "./index" carries `import "server-only"`, which throws
// unconditionally under a plain Node/Bun require (see code-standards.md) —
// only Next's bundler resolves it to a no-op. A dynamic import inside a
// beforeAll that still runs would crash CI's plain `bun test` even though
// this whole tier is meant to be invisible to it. Not registering the
// describe block at all is the only thing that actually prevents that
// import from executing.
//
// Run this file locally with `bun test --conditions=react-server`, which
// resolves "server-only" to its no-op export condition the same way Next's
// server bundle does.
const hasDb = Boolean(process.env.DATABASE_URL);

function randomSlug(): string {
  return Math.random().toString(36).slice(2, 12);
}

// drizzle-orm wraps the driver's error as DrizzleQueryError — the real
// PostgresError, and its .code, live at .cause (tech-stack.md/PHASE-1 D8
// note: the blueprint assumed err.code directly, which is only true for raw
// postgres.js, not a query run through Drizzle's query builder or db.execute).
async function expectPgErrorCode(promise: Promise<unknown>, code: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeDefined();
  const cause = (caught as { cause?: { code?: string } }).cause;
  expect(cause?.code).toBe(code);
}

if (hasDb) {
  describe("schema constraints (live Supabase)", () => {
    let db: (typeof import("./index"))["db"];
    let user: (typeof import("./auth-schema"))["user"];
    let recommendation: (typeof import("./schema"))["recommendation"];
    let recommendationItem: (typeof import("./schema"))["recommendationItem"];

    const testUserId = `test-user-${randomSlug()}`;
    const createdSlugs: string[] = [];

    beforeAll(async () => {
      ({ db } = await import("./index"));
      ({ user } = await import("./auth-schema"));
      ({ recommendation, recommendationItem } = await import("./schema"));
      await db.insert(user).values({
        id: testUserId,
        name: "Schema Test User",
        email: `${testUserId}@users.tsugi.invalid`,
      });
    });

    afterAll(async () => {
      // Cascades to recommendation_item. One round trip, not one per slug —
      // a previous per-slug loop blew past bun test's 5s hook timeout.
      if (createdSlugs.length > 0) {
        await db.delete(recommendation).where(inArray(recommendation.slug, createdSlugs));
      }
      await db.delete(user).where(eq(user.id, testUserId));
    });

    function trackSlug(slug: string) {
      createdSlugs.push(slug);
      return slug;
    }

    test("a three-item recommendation round-trips by slug, in position order", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId, comment: "great picks" });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));
      expect(rec).toBeDefined();
      expect(rec!.views).toBe(0);
      expect(rec!.createdAt).toBeInstanceOf(Date);
      expect(rec!.comment).toBe("great picks");

      await db.insert(recommendationItem).values([
        {
          recommendationId: rec!.id,
          position: 2,
          provider: "anilist",
          externalId: 3,
          mediaType: "anime",
          title: "Third",
        },
        {
          recommendationId: rec!.id,
          position: 0,
          provider: "anilist",
          externalId: 1,
          mediaType: "anime",
          title: "First",
        },
        {
          recommendationId: rec!.id,
          position: 1,
          provider: "mal",
          externalId: 2,
          mediaType: "manga",
          title: "Second",
        },
      ]);

      const items = await db
        .select()
        .from(recommendationItem)
        .where(eq(recommendationItem.recommendationId, rec!.id))
        .orderBy(asc(recommendationItem.position));

      expect(items.map((item) => item.title)).toEqual(["First", "Second", "Third"]);
      expect(items.map((item) => item.position)).toEqual([0, 1, 2]);
    });

    test("a one-item recommendation round-trips identically to a group", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));
      await db.insert(recommendationItem).values({
        recommendationId: rec!.id,
        position: 0,
        provider: "anilist",
        externalId: 154587,
        mediaType: "anime",
        title: "Frieren",
      });
      const items = await db
        .select()
        .from(recommendationItem)
        .where(eq(recommendationItem.recommendationId, rec!.id));
      expect(items).toHaveLength(1);
      expect(items[0]!.title).toBe("Frieren");
    });

    test("deleting a recommendation cascades to its items", async () => {
      const slug = randomSlug();
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));
      await db.insert(recommendationItem).values({
        recommendationId: rec!.id,
        position: 0,
        provider: "anilist",
        externalId: 1,
        mediaType: "anime",
        title: "Doomed",
      });

      await db.delete(recommendation).where(eq(recommendation.slug, slug));

      const remaining = await db
        .select()
        .from(recommendationItem)
        .where(eq(recommendationItem.recommendationId, rec!.id));
      expect(remaining).toHaveLength(0);
    });

    // varchar(280) itself rejects an oversized value (22001) before any CHECK
    // would evaluate — see the comment on the column in schema.ts.
    test("a 281-character group comment fails at the database", async () => {
      const slug = randomSlug();
      await expectPgErrorCode(
        db.insert(recommendation).values({ slug, userId: testUserId, comment: "a".repeat(281) }),
        "22001",
      );
    });

    test("a 281-character item comment fails at the database", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));
      await expectPgErrorCode(
        db.insert(recommendationItem).values({
          recommendationId: rec!.id,
          position: 0,
          provider: "anilist",
          externalId: 1,
          mediaType: "anime",
          title: "X",
          comment: "a".repeat(281),
        }),
        "22001",
      );
    });

    test("a duplicate slug fails with 23505 (unique_violation)", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      await expectPgErrorCode(
        db.insert(recommendation).values({ slug, userId: testUserId }),
        "23505",
      );
    });

    test("inserting with userId = null fails", async () => {
      const slug = randomSlug();
      await expectPgErrorCode(
        db.execute(sql`insert into "recommendation" (slug, user_id) values (${slug}, null)`),
        "23502",
      );
    });

    test("scoreRaw set with scoreFormat null fails, and vice versa", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));

      await expectPgErrorCode(
        db.insert(recommendationItem).values({
          recommendationId: rec!.id,
          position: 0,
          provider: "anilist",
          externalId: 1,
          mediaType: "anime",
          title: "X",
          scoreRaw: 8,
        }),
        "23514",
      );

      await expectPgErrorCode(
        db.execute(
          sql`insert into "recommendation_item"
            (recommendation_id, position, provider, external_id, media_type, title, score_format)
            values (${rec!.id}, 1, 'anilist', 2, 'anime', 'Y', 'POINT_10')`,
        ),
        "23514",
      );
    });

    test("an item with both score fields null inserts fine", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));
      await db.insert(recommendationItem).values({
        recommendationId: rec!.id,
        position: 0,
        provider: "anilist",
        externalId: 1,
        mediaType: "anime",
        title: "Unrated",
      });
      const [item] = await db
        .select()
        .from(recommendationItem)
        .where(eq(recommendationItem.recommendationId, rec!.id));
      expect(item!.scoreRaw).toBeNull();
      expect(item!.scoreFormat).toBeNull();
    });

    test("scores store exactly with no rounding, as numbers not strings", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));
      await db.insert(recommendationItem).values([
        {
          recommendationId: rec!.id,
          position: 0,
          provider: "anilist",
          externalId: 1,
          mediaType: "anime",
          title: "Hundred scale",
          scoreRaw: 87,
          scoreFormat: "POINT_100",
        },
        {
          recommendationId: rec!.id,
          position: 1,
          provider: "anilist",
          externalId: 2,
          mediaType: "anime",
          title: "Decimal scale",
          scoreRaw: 8.7,
          scoreFormat: "POINT_10_DECIMAL",
        },
      ]);
      const items = await db
        .select()
        .from(recommendationItem)
        .where(eq(recommendationItem.recommendationId, rec!.id))
        .orderBy(asc(recommendationItem.position));

      expect(typeof items[0]!.scoreRaw).toBe("number");
      expect(items[0]!.scoreRaw).toBe(87);
      expect(typeof items[1]!.scoreRaw).toBe("number");
      expect(items[1]!.scoreRaw).toBe(8.7);
    });

    test("the same identity triple twice in one recommendation fails; across two succeeds", async () => {
      const slugA = trackSlug(randomSlug());
      const slugB = trackSlug(randomSlug());
      await db.insert(recommendation).values([
        { slug: slugA, userId: testUserId },
        { slug: slugB, userId: testUserId },
      ]);
      const [recA] = await db.select().from(recommendation).where(eq(recommendation.slug, slugA));
      const [recB] = await db.select().from(recommendation).where(eq(recommendation.slug, slugB));

      await db.insert(recommendationItem).values({
        recommendationId: recA!.id,
        position: 0,
        provider: "anilist",
        externalId: 154587,
        mediaType: "anime",
        title: "Frieren",
      });

      await expectPgErrorCode(
        db.insert(recommendationItem).values({
          recommendationId: recA!.id,
          position: 1,
          provider: "anilist",
          externalId: 154587,
          mediaType: "anime",
          title: "Frieren again",
        }),
        "23505",
      );

      // Same triple, different recommendation — a different user's post, allowed.
      await db.insert(recommendationItem).values({
        recommendationId: recB!.id,
        position: 0,
        provider: "anilist",
        externalId: 154587,
        mediaType: "anime",
        title: "Frieren",
      });
      const inRecB = await db
        .select()
        .from(recommendationItem)
        .where(eq(recommendationItem.recommendationId, recB!.id));
      expect(inRecB).toHaveLength(1);
    });

    test("two items with the same mediaType/externalId but different provider both insert", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));

      // AniList's Frieren (154587) and MAL's Frieren (52991) are different ids in
      // different id spaces — this pair intentionally does NOT collide with the
      // triple-uniqueness constraint, which is exactly the point being tested
      // here with a shared externalId across providers instead.
      await db.insert(recommendationItem).values([
        {
          recommendationId: rec!.id,
          position: 0,
          provider: "anilist",
          externalId: 999,
          mediaType: "anime",
          title: "AniList #999",
        },
        {
          recommendationId: rec!.id,
          position: 1,
          provider: "mal",
          externalId: 999,
          mediaType: "anime",
          title: "MAL #999",
        },
      ]);
      const items = await db
        .select()
        .from(recommendationItem)
        .where(eq(recommendationItem.recommendationId, rec!.id));
      expect(items).toHaveLength(2);
    });

    test("an out-of-range provider or scoreFormat fails at the database", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));

      await expectPgErrorCode(
        db.execute(
          sql`insert into "recommendation_item"
            (recommendation_id, position, provider, external_id, media_type, title)
            values (${rec!.id}, 0, 'crunchyroll', 1, 'anime', 'X')`,
        ),
        "22P02",
      );

      await expectPgErrorCode(
        db.execute(
          sql`insert into "recommendation_item"
            (recommendation_id, position, provider, external_id, media_type, title, score_raw, score_format)
            values (${rec!.id}, 0, 'anilist', 1, 'anime', 'X', 5, 'POINT_7')`,
        ),
        "22P02",
      );
    });

    test("duplicate position within a recommendation fails", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));
      await db.insert(recommendationItem).values({
        recommendationId: rec!.id,
        position: 0,
        provider: "anilist",
        externalId: 1,
        mediaType: "anime",
        title: "First",
      });
      await expectPgErrorCode(
        db.insert(recommendationItem).values({
          recommendationId: rec!.id,
          position: 0,
          provider: "anilist",
          externalId: 2,
          mediaType: "anime",
          title: "Also first",
        }),
        "23505",
      );
    });

    test("scoreRaw: 0 fails — 0 means unrated, not rated zero (D35)", async () => {
      const slug = trackSlug(randomSlug());
      await db.insert(recommendation).values({ slug, userId: testUserId });
      const [rec] = await db.select().from(recommendation).where(eq(recommendation.slug, slug));
      await expectPgErrorCode(
        db.insert(recommendationItem).values({
          recommendationId: rec!.id,
          position: 0,
          provider: "anilist",
          externalId: 1,
          mediaType: "anime",
          title: "X",
          scoreRaw: 0,
          scoreFormat: "POINT_100",
        }),
        "23514",
      );
    });

    test("user.scoreFormat defaults to POINT_10 and rejects an out-of-range value", async () => {
      const [row] = await db.select().from(user).where(eq(user.id, testUserId));
      expect(row!.scoreFormat).toBe("POINT_10");

      await expectPgErrorCode(
        db.execute(
          sql`insert into "user" (id, name, email, score_format)
            values (${`bad-${randomSlug()}`}, 'Bad', ${`bad-${randomSlug()}@users.tsugi.invalid`}, 'POINT_7')`,
        ),
        "22P02",
      );
    });
  });
}
