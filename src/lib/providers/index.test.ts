import { describe, expect, spyOn, test } from "bun:test";
import berserkFixture from "./__fixtures__/anilist-search-berserk-manga.json";
import frierenAniListFixture from "./__fixtures__/anilist-search-frieren-anime.json";
import frierenJikanFixture from "./__fixtures__/jikan-search-frieren-anime.json";
import { mockFetchJSON, mockFetchReject } from "./__fixtures__/mock-fetch";
import { searchMedia } from "./index";

const ANILIST_KEYS = ["provider", "externalId", "mediaType", "title", "titleNative", "coverImage", "year", "averageScore", "genres"].sort();

describe("searchMedia (dispatch)", () => {
  // Criterion 4, across both providers — a bare Object.keys() comparison, no
  // provider-specific inspection, so a drifting adapter shows up here first.
  test("AniList and MAL results share exactly the same keys", async () => {
    const anilist = await searchMedia(
      "anilist",
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON(frierenAniListFixture),
    );
    const mal = await searchMedia(
      "mal",
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON(frierenJikanFixture),
    );

    expect(anilist.ok).toBe(true);
    expect(mal.ok).toBe(true);
    if (!anilist.ok || !mal.ok) return;
    expect(Object.keys(anilist.data[0]!).sort()).toEqual(ANILIST_KEYS);
    expect(Object.keys(mal.data[0]!).sort()).toEqual(ANILIST_KEYS);
  });

  // Criterion 7 — the highest-consequence one in the phase (D15). Forcing
  // "mal" to fail must never produce an AniList-shaped success.
  test("a forced MAL failure returns ok:false and never AniList data", async () => {
    const result = await searchMedia(
      "mal",
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchReject("TypeError"),
    );

    expect(result.ok).toBe(false);
    // Even in failure, nothing about the call ever touched AniList — proven
    // structurally: providers/index.ts's switch has one branch per provider,
    // and this test's fetchImpl only ever rejects. If a fallback existed,
    // this would resolve ok:true with provider: "anilist" instead.
  });

  test("a forced AniList failure returns ok:false and never MAL data", async () => {
    const result = await searchMedia(
      "anilist",
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchReject("TypeError"),
    );
    expect(result.ok).toBe(false);
  });

  test("a manga search through the dispatch still reports mediaType: manga", async () => {
    const result = await searchMedia(
      "anilist",
      "berserk",
      "manga",
      new AbortController().signal,
      mockFetchJSON(berserkFixture),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.every((item) => item.mediaType === "manga")).toBe(true);
  });

  describe("criterion 13 — failure logging", () => {
    test("a failed call logs the provider, reason, and elapsed time", async () => {
      const warn = spyOn(console, "warn").mockImplementation(() => {});
      try {
        await searchMedia(
          "mal",
          "frieren",
          "anime",
          new AbortController().signal,
          mockFetchReject("TypeError"),
        );

        expect(warn).toHaveBeenCalledTimes(1);
        const [line] = warn.mock.calls[0] as [string];
        expect(line).toContain("mal");
        expect(line).toContain("unavailable");
        expect(line).toMatch(/\d+ms/);
      } finally {
        warn.mockRestore();
      }
    });

    test("a successful call does not log anything", async () => {
      const warn = spyOn(console, "warn").mockImplementation(() => {});
      try {
        await searchMedia(
          "anilist",
          "frieren",
          "anime",
          new AbortController().signal,
          mockFetchJSON(frierenAniListFixture),
        );
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  });
});
