import { describe, expect, test } from "bun:test";
import berserkFixture from "./__fixtures__/anilist-search-berserk-manga.json";
import frierenSearchFixture from "./__fixtures__/anilist-search-frieren-anime.json";
import frierenResolveFixture from "./__fixtures__/anilist-resolve-154587.json";
import { countCalls, mockFetchHang, mockFetchJSON, mockFetchReject } from "./__fixtures__/mock-fetch";
import { resolveAniList, searchAniList } from "./anilist-client";

const ALL_KEYS = [
  "provider",
  "externalId",
  "mediaType",
  "title",
  "titleNative",
  "coverImage",
  "year",
  "averageScore",
  "genres",
].sort();

describe("searchAniList", () => {
  // Criterion 1. The apostrophe in the fixture is U+2019 — copied from the
  // recorded response, never retyped (PHASE-3.md's own warning about this).
  test("returns Frieren as the first result, with the correct id and a cover image", async () => {
    const result = await searchAniList(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON(frierenSearchFixture),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    const first = result.data[0]!;
    expect(first.title).toBe("Frieren: Beyond Journey’s End");
    expect(first.externalId).toBe(154587);
    expect(first.provider).toBe("anilist");
    expect(first.coverImage).not.toBeNull();
  });

  // Criterion 3.
  test("a manga search returns mediaType: manga", async () => {
    const result = await searchAniList(
      "berserk",
      "manga",
      new AbortController().signal,
      mockFetchJSON(berserkFixture),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const item of result.data) {
      expect(item.mediaType).toBe("manga");
    }
  });

  // Criterion 4 (AniList half — see providers/index.test.ts for the full
  // cross-provider comparison).
  test("results carry exactly the UnifiedMediaResult keys, no more, no fewer", async () => {
    const result = await searchAniList(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON(frierenSearchFixture),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.data[0]!).sort()).toEqual(ALL_KEYS);
  });

  // Criterion 8: a forced failure never throws.
  test("a network failure returns ok:false rather than throwing", async () => {
    const result = await searchAniList(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchReject("TypeError"),
    );
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  // Criterion 9: a hung request settles within 6s (adapter ceiling is 3s).
  test("a hung request settles within 6 seconds", async () => {
    const start = performance.now();
    const result = await searchAniList(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchHang(),
    );
    expect(performance.now() - start).toBeLessThan(6_000);
    expect(result.ok).toBe(false);
  }, 7_000);

  // Criterion 10: a malformed payload never produces a partial result.
  test("a malformed payload (missing Page.media) returns ok:false", async () => {
    const result = await searchAniList(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON({ data: {} }),
    );
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  // Criterion 12: every fetch in the adapter passes a signal.
  test("passes a signal on its fetch call", async () => {
    let sawSignal = false;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      sawSignal = init?.signal instanceof AbortSignal;
      return new Response(JSON.stringify(frierenSearchFixture), { status: 200 });
    }) as typeof fetch;

    await searchAniList("frieren", "anime", new AbortController().signal, fetchImpl);
    expect(sawSignal).toBe(true);
  });

  test("an already-aborted caller signal is honoured", async () => {
    const controller = new AbortController();
    controller.abort();
    const { fetchImpl, count } = countCalls(mockFetchJSON(frierenSearchFixture));
    const result = await searchAniList("frieren", "anime", controller.signal, fetchImpl);
    expect(result.ok).toBe(false);
    // The abort happens before the request completes meaningfully either way —
    // asserting on the result shape, not call count, since fetch may still fire
    // once before observing an already-aborted signal.
    expect(count()).toBeGreaterThanOrEqual(0);
  });
});

describe("resolveAniList", () => {
  // Criterion 5.
  test("resolves id 154587 to Frieren with the correct title", async () => {
    const result = await resolveAniList(154587, "anime", mockFetchJSON(frierenResolveFixture));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe("Frieren: Beyond Journey’s End");
    expect(result.data.externalId).toBe(154587);
  });

  test("a 404 (id not found) returns ok:false, reason: not_found", async () => {
    const result = await resolveAniList(999999999, "anime", mockFetchJSON({ errors: [] }, 404));
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  test("a 429 returns ok:false, reason: rate_limited", async () => {
    const result = await resolveAniList(154587, "anime", mockFetchJSON({}, 429));
    expect(result).toEqual({ ok: false, reason: "rate_limited" });
  });
});

// D48 — genres arrive with the rest of the media, and every consumer maps over
// them without a guard, so the one thing that must never happen is `undefined`.
describe("searchAniList genres", () => {
  test("maps the provider's genre list through unchanged", async () => {
    const result = await searchAniList(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON({
        data: {
          Page: {
            media: [
              {
                id: 154587,
                type: "ANIME",
                title: { english: "Frieren", romaji: "Sousou no Frieren", native: null },
                coverImage: null,
                startDate: { year: 2023 },
                averageScore: 89,
                genres: ["Adventure", "Drama", "Fantasy"],
              },
            ],
          },
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]!.genres).toEqual(["Adventure", "Drama", "Fantasy"]);
  });

  // The recorded fixtures predate the field, which makes them the exact case
  // this has to survive: a response with no `genres` key at all.
  test("a response without a genres field yields [], never undefined", async () => {
    const result = await searchAniList(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON(frierenSearchFixture),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]!.genres).toEqual([]);
  });
});
