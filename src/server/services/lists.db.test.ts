import { afterAll, beforeAll, describe, expect, test } from "bun:test";

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

    // The owner every helper below attributes its list to. Created here rather
    // than borrowed from whatever `select id from "user" limit 1` happened to
    // return: that earlier version passed only because development residue was
    // sitting in the table, and every test in this file failed the moment the
    // database was emptied. A test tier must bring its own fixtures.
    //
    // `getListBySlug` hides drafts from everyone but their owner (D42), so the
    // id has to be stable across the whole describe block, not per test.
    const testUserId = `test-user-${Math.random().toString(36).slice(2, 12)}`;

    beforeAll(async () => {
      const { user } = await import("@/db/auth-schema");
      await (await db()).insert(user).values({
        id: testUserId,
        name: "Lists Service Test User",
        email: `${testUserId}@users.tsugi.invalid`,
      });
    });

    async function makeList(overrides: Record<string, unknown> = {}) {
      const { createList } = await service();
      const result = await createList(testUserId, {
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
      const { eq, inArray } = await import("drizzle-orm");
      const { list } = await import("@/db/schema");
      const { user } = await import("@/db/auth-schema");
      // Lists first, then the owner: list.user_id is ON DELETE NO ACTION, so
      // deleting the user while any of its lists survive throws a FK violation
      // and leaks both rows. Deleting the list cascades to list_item.
      if (createdSlugs.length > 0) {
        await (await db()).delete(list).where(inArray(list.slug, createdSlugs));
      }
      await (await db()).delete(user).where(eq(user.id, testUserId));
    });

    test(
      "a created list stores its category and resolves genres per item",
      async () => {
        const slug = await makeList();
        const { getListBySlug } = await service();
        const view = await getListBySlug(slug, testUserId);

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
        const view = await getListBySlug(slug, testUserId);

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
        const view = await getListBySlug(slug, testUserId);

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

        const draft = await getListBySlug(draftSlug, testUserId);
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

    test(
      "search matches an item's title, not just the list's own fields",
      async () => {
        // The list is named something the query cannot match, so a hit can only
        // have come from the EXISTS over list_item.title.
        const slug = await makeList({
          publish: true,
          name: "Zzz unrelated title",
        });
        const { listPublishedFeed } = await service();

        const byItem = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          q: "Frieren",
        });
        expect(byItem.map((entry) => entry.slug)).toContain(slug);

        const miss = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          q: "qqzzxnothing",
        });
        expect(miss.map((entry) => entry.slug)).not.toContain(slug);
      },
      TIMEOUT,
    );

    test(
      "the mediaType filter excludes a list with no item of that type",
      async () => {
        const animeOnly = await makeList({
          publish: true,
          items: [
            {
              provider: "anilist",
              externalId: FRIEREN,
              mediaType: "anime",
              scoreRaw: 9,
              scoreFormat: "POINT_10",
            },
          ],
        });
        const { listPublishedFeed } = await service();

        const asAnime = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          mediaType: "anime",
        });
        expect(asAnime.map((entry) => entry.slug)).toContain(animeOnly);

        const asManga = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          mediaType: "manga",
        });
        expect(asManga.map((entry) => entry.slug)).not.toContain(animeOnly);
      },
      TIMEOUT,
    );

    test(
      "both filters together still return one row per list, and covers carry their scores",
      async () => {
        const slug = await makeList({ publish: true });
        const { listPublishedFeed } = await service();

        const entries = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          mediaType: "anime",
          genre: "Fantasy",
        });

        // The two EXISTS subqueries must not become joins: either one would
        // multiply this list's row by its matching items.
        const matches = entries.filter((entry) => entry.slug === slug);
        expect(matches).toHaveLength(1);

        // A1 widened `covers` from bare URLs to (title, raw, format) triples.
        const covers = matches[0]!.covers;
        expect(covers.length).toBeGreaterThan(0);
        expect(covers[0]!.title.length).toBeGreaterThan(0);
        expect(covers.some((cover) => cover.scoreFormat === "POINT_100")).toBe(true);
      },
      TIMEOUT,
    );

    test(
      "the sidebar facets are narrowed by the other active filters",
      async () => {
        await makeList({ publish: true, category: "Fantasy" });
        const { listFeedCategories, listFeedGenres, listFeedMediaTypeCounts } =
          await service();

        // Every facet drops its *own* dimension, so filtering by category must
        // still return the whole category directory — otherwise the panel could
        // only ever confirm the choice already made.
        const categories = await listFeedCategories({ category: "Fantasy" });
        expect(categories.length).toBeGreaterThan(0);

        // ...but a nonsense search narrows all three to nothing.
        const empty = await listFeedCategories({ q: "qqzzxnothing" });
        expect(empty).toHaveLength(0);
        expect(await listFeedGenres({ q: "qqzzxnothing" })).toHaveLength(0);

        const counts = await listFeedMediaTypeCounts({ q: "qqzzxnothing" });
        expect(counts).toEqual({ all: 0, anime: 0, manga: 0 });
      },
      TIMEOUT,
    );

    /*
      editList (D59). The interesting cases are the ones a metadata-only PATCH
      never had: replacing the item set, keeping already-resolved items off the
      provider, clearing an optional field, and refusing a stranger.
    */
    test(
      "an edit replaces the item set, reorders it, and rescores it",
      async () => {
        const slug = await makeList();
        const { editList, getListBySlug } = await service();

        const result = await editList(slug, testUserId, {
          name: "Edited title",
          category: "Horror",
          comment: "edited by lists.db.test.ts",
          // Berserk first, Frieren dropped, one new score.
          items: [
            {
              provider: "anilist",
              externalId: BERSERK,
              mediaType: "manga",
              scoreRaw: 10,
              scoreFormat: "POINT_10",
              comment: "moved to the top",
            },
          ],
        } as never);

        expect(result.ok).toBe(true);
        const view = await getListBySlug(slug, testUserId);
        expect(view!.name).toBe("Edited title");
        expect(view!.category).toBe("Horror");
        expect(view!.items).toHaveLength(1);
        expect(view!.items[0]!.externalId).toBe(BERSERK);
        expect(view!.items[0]!.position).toBe(0);
        expect(view!.items[0]!.scoreRaw).toBe(10);
        expect(view!.items[0]!.comment).toBe("moved to the top");
        // Kept from the stored row rather than re-resolved, so the genres that
        // were never in the request body survive the edit.
        expect(view!.items[0]!.genres.length).toBeGreaterThan(0);
      },
      TIMEOUT,
    );

    test(
      "an edit that only reorders never calls a provider",
      async () => {
        const slug = await makeList();
        const { editList, getListBySlug } = await service();

        // A fetch that throws on any call: if the edit path tries to resolve an
        // item it already has stored, this fails loudly instead of silently
        // making network calls on a path that must not need them.
        const noFetch = (() => {
          throw new Error("editList resolved an item it should have reused");
        }) as unknown as typeof fetch;

        const result = await editList(
          slug,
          testUserId,
          {
            name: "Genre and publish check",
            category: "Fantasy",
            comment: "created by lists.db.test.ts",
            items: [
              { provider: "anilist", externalId: BERSERK, mediaType: "manga", scoreRaw: 87, scoreFormat: "POINT_100" },
              { provider: "anilist", externalId: FRIEREN, mediaType: "anime", scoreRaw: 9, scoreFormat: "POINT_10" },
            ],
          } as never,
          noFetch,
        );

        expect(result.ok).toBe(true);
        const view = await getListBySlug(slug, testUserId);
        expect(view!.items.map((item) => item.externalId)).toEqual([BERSERK, FRIEREN]);
      },
      TIMEOUT,
    );

    test(
      "an omitted caption is cleared, not left alone",
      async () => {
        const slug = await makeList({ caption: "the original caption" });
        const { editList, getListBySlug } = await service();

        expect((await getListBySlug(slug, testUserId))!.caption).toBe("the original caption");

        await editList(slug, testUserId, {
          name: "Genre and publish check",
          category: "Fantasy",
          comment: "still says something",
          items: [{ provider: "anilist", externalId: FRIEREN, mediaType: "anime" }],
        } as never);

        expect((await getListBySlug(slug, testUserId))!.caption).toBeNull();
      },
      TIMEOUT,
    );

    test(
      "editing someone else's list is not_found, and changes nothing",
      async () => {
        const slug = await makeList();
        const { editList, getListBySlug } = await service();

        const result = await editList(slug, `${testUserId}-impostor`, {
          name: "Hijacked",
          category: "Horror",
          comment: "should never land",
          items: [{ provider: "anilist", externalId: FRIEREN, mediaType: "anime" }],
        } as never);

        expect(result).toEqual({ ok: false, reason: "not_found" });
        expect((await getListBySlug(slug, testUserId))!.name).toBe("Genre and publish check");
      },
      TIMEOUT,
    );

    test(
      "isOwner is true for the owner and false for everyone else",
      async () => {
        const slug = await makeList({ publish: true });
        const { getListBySlug, getOwnedListBySlug } = await service();

        expect((await getListBySlug(slug, testUserId))!.isOwner).toBe(true);
        expect((await getListBySlug(slug, "somebody-else"))!.isOwner).toBe(false);
        expect((await getListBySlug(slug, null))!.isOwner).toBe(false);

        // The edit route's read refuses a published list that is not the caller's.
        expect(await getOwnedListBySlug(slug, testUserId)).not.toBeNull();
        expect(await getOwnedListBySlug(slug, "somebody-else")).toBeNull();
      },
      TIMEOUT,
    );

    test(
      "a search containing a wildcard is matched literally",
      async () => {
        const slug = await makeList({
          publish: true,
          name: "Ninety_nine percent",
        });
        const { listPublishedFeed } = await service();

        // Unescaped, `_` is ILIKE's any-single-character wildcard, so this would
        // also match "Ninety nine" and anything else of that shape.
        const literal = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          q: "Ninety_nine",
        });
        expect(literal.map((entry) => entry.slug)).toContain(slug);

        const wildcarded = await listPublishedFeed({
          page: 1,
          pageSize: 50,
          sort: "new",
          q: "Ninety%nine",
        });
        expect(wildcarded.map((entry) => entry.slug)).not.toContain(slug);
      },
      TIMEOUT,
    );
  });
}
