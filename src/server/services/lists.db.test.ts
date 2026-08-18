import { afterAll, describe, expect, test } from "bun:test";

/*
  Live-database tier (D22). Covers what D47/D48/D49 added to the create and read
  paths: the category column, per-item genres, the publish-on-create flag, the
  author join, and the feed's genre filter.

  Every test carries an explicit timeout — several sequential round-trips to a
  remote pooler comfortably exceed Bun's 5s default, and the failure then looks
  like a hang rather than latency (AGENTS.md).

  `createList` resolves each item against AniList for real, so these also depend
  on that API being reachable; a provider outage fails them, which is the same
  bargain the rest of the .db tier already makes.
*/
const hasDb = Boolean(process.env.DATABASE_URL);
const TIMEOUT = 30_000;

// Frieren (anime) and Berserk (manga) — both stable AniList ids used elsewhere
// in the fixtures, chosen so the genre assertions have something real to land on.
const FRIEREN = 154587;
const BERSERK = 30002;

if (hasDb) {
  describe("createList / getListBySlug / listPublishedFeed (D47, D48, D49)", () => {
    const createdSlugs: string[] = [];

    async function db() {
      return (await import("@/db")).db;
    }

    async function service() {
      return import("@/server/services/lists");
    }

    // Cached so every helper below reads the same owner — `getListBySlug` hides
    // drafts from everyone but their owner (D42), so passing the wrong id back
    // in would look like the list vanished.
    let ownerId: string | null = null;

    async function anyUserId(): Promise<string> {
      if (ownerId) return ownerId;
      const { sql } = await import("drizzle-orm");
      const rows = await (await db()).execute<{ id: string }>(sql`select id from "user" limit 1`);
      const id = [...rows][0]?.id;
      if (!id) throw new Error("no user rows to attribute a test list to");
      ownerId = id;
      return id;
    }

    async function makeList(overrides: Record<string, unknown> = {}) {
      const { createList } = await service();
      const result = await createList(await anyUserId(), {
        name: "Genre and publish check",
        category: "Fantasy",
        comment: "created by lists.db.test.ts",
        items: [
          {
            provider: "anilist",
            externalId: FRIEREN,
            mediaType: "anime",
            scoreRaw: 9,
            scoreFormat: "POINT_10",
          },
          {
            provider: "anilist",
            externalId: BERSERK,
            mediaType: "manga",
            // An imported-style score on a different scale — D47 says it is kept
            // as rated rather than converted into the ten-point typed scale.
            scoreRaw: 87,
            scoreFormat: "POINT_100",
          },
        ],
        ...overrides,
      } as never);

      if (!result.ok) throw new Error(`createList failed: ${result.reason}`);
      createdSlugs.push(result.slug);
      return result.slug;
    }

    afterAll(async () => {
      if (createdSlugs.length === 0) return;
      const { inArray } = await import("drizzle-orm");
      const { list } = await import("@/db/schema");
      await (await db()).delete(list).where(inArray(list.slug, createdSlugs));
    });

    test(
      "a created list stores its category and resolves genres per item",
      async () => {
        const slug = await makeList();
        const { getListBySlug } = await service();
        const view = await getListBySlug(slug, await anyUserId());

        expect(view).not.toBeNull();
        expect(view!.category).toBe("Fantasy");
        // Resolved server-side (D13) — the request above sent no genres at all.
        expect(view!.items[0]!.genres.length).toBeGreaterThan(0);
        expect(view!.items[0]!.genres).toContain("Fantasy");
      },
      TIMEOUT,
    );

    test(
      "the genre cloud aggregates the items and is ranked by frequency",
      async () => {
        const slug = await makeList();
        const { getListBySlug } = await service();
        const view = await getListBySlug(slug, await anyUserId());

        expect(view!.genres.length).toBeGreaterThan(0);
        // Both titles are Fantasy, so it must outrank anything only one carries.
        expect(view!.genres[0]!.count).toBeGreaterThanOrEqual(view!.genres.at(-1)!.count);
        const counts = view!.genres.map((genre) => genre.count);
        expect([...counts].sort((a, b) => b - a)).toEqual(counts);
      },
      TIMEOUT,
    );

    test(
      "each item keeps the score format it was submitted with, not one shared format (D47)",
      async () => {
        const slug = await makeList();
        const { getListBySlug } = await service();
        const view = await getListBySlug(slug, await anyUserId());

        const formats = view!.items.map((item) => item.scoreFormat).sort();
        expect(formats).toEqual(["POINT_10", "POINT_100"]);
        // The pair is intact on both (invariant 6).
        for (const item of view!.items) {
          expect(item.scoreRaw === null).toBe(item.scoreFormat === null);
        }
      },
      TIMEOUT,
    );

    test(
      "publish: true publishes in the same write, and omitting it leaves a draft",
      async () => {
        const { getListBySlug } = await service();

        const published = await getListBySlug(await makeList({ publish: true }), null);
        expect(published!.published).toBe(true);
        expect(published!.publishedAt).not.toBeNull();

        // A draft is invisible to anyone but its owner (D42), so read it as the
        // owner — an anonymous read here returns null, which is the point.
        const draftSlug = await makeList();
        expect(await getListBySlug(draftSlug, null)).toBeNull();

        const draft = await getListBySlug(draftSlug, await anyUserId());
        expect(draft!.published).toBe(false);
        expect(draft!.publishedAt).toBeNull();
      },
      TIMEOUT,
    );

    test(
      "the feed carries the author's handle and does not duplicate rows (D49)",
      async () => {
        const slug = await makeList({ publish: true });
        const { listPublishedFeed } = await service();
        const entries = await listPublishedFeed({ page: 1, pageSize: 50, sort: "new" });

        const matches = entries.filter((entry) => entry.slug === slug);
        // The `user` inner join must not multiply the row the way joining
        // list_vote and list_item together once did.
        expect(matches).toHaveLength(1);
        expect(matches[0]!).toHaveProperty("authorUsername");
        expect(matches[0]!.category).toBe("Fantasy");
      },
      TIMEOUT,
    );

    test(
      "the feed filters by genre, and an unknown genre returns nothing",
      async () => {
        const slug = await makeList({ publish: true });
        const { listPublishedFeed } = await service();

        const fantasy = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          genre: "Fantasy",
        });
        expect(fantasy.map((entry) => entry.slug)).toContain(slug);

        const nonsense = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          genre: "NotARealGenre",
        });
        expect(nonsense).toHaveLength(0);
      },
      TIMEOUT,
    );

    test(
      "the feed filters by the category column rather than the list's title (D48)",
      async () => {
        const slug = await makeList({ publish: true, name: "Horror", category: "Fantasy" });
        const { listPublishedFeed } = await service();

        // The list is *titled* "Horror" but filed under Fantasy. Before D48 the
        // filter compared `name`, so this is the case that would regress.
        const asHorror = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          category: "Horror",
        });
        expect(asHorror.map((entry) => entry.slug)).not.toContain(slug);

        const asFantasy = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          category: "Fantasy",
        });
        expect(asFantasy.map((entry) => entry.slug)).toContain(slug);
      },
      TIMEOUT,
    );
  });
}
