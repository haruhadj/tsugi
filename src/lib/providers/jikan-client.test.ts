import { describe, expect, test } from "bun:test";
import frierenFixture from "./__fixtures__/jikan-search-frieren-anime.json";
import notFoundFixture from "./__fixtures__/jikan-resolve-154587-not-found.json";
import { countCalls, mockFetchFailThenSucceed, mockFetchHang, mockFetchJSON, mockFetchReject } from "./__fixtures__/mock-fetch";
import { resolveJikan, searchJikan } from "./jikan-client";

describe("searchJikan", () => {
  // Criterion 2 — a different externalId for the same show, which is the whole point.
  test("returns Frieren under MAL's own id, distinct from AniList's", async () => {
    const result = await searchJikan(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON(frierenFixture),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = result.data[0]!;
    expect(first.provider).toBe("mal");
    expect(first.externalId).toBe(52991);
  });

  // Criterion 8.
  test("a network failure returns ok:false rather than throwing", async () => {
    const { fetchImpl } = countCalls(mockFetchReject("TypeError"));
    const result = await searchJikan("frieren", "anime", new AbortController().signal, fetchImpl);
    expect(result.ok).toBe(false);
  });

  // Criterion 9.
  test("a hung request settles within 6 seconds", async () => {
    const start = performance.now();
    const result = await searchJikan(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchHang(),
    );
    expect(performance.now() - start).toBeLessThan(6_000);
    expect(result.ok).toBe(false);
  }, 7_000);

  // Criterion 10.
  test("a malformed payload (missing data array) returns ok:false", async () => {
    const result = await searchJikan(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON({}),
    );
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  // Criterion 12.
  test("passes a signal on its fetch call", async () => {
    let sawSignal = false;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      sawSignal = init?.signal instanceof AbortSignal;
      return new Response(JSON.stringify(frierenFixture), { status: 200 });
    }) as typeof fetch;

    await searchJikan("frieren", "anime", new AbortController().signal, fetchImpl);
    expect(sawSignal).toBe(true);
  });

  // The same-provider retry (D15 / "It is retried once against Jikan").
  test("a first failure retries once against Jikan and can still succeed", async () => {
    const { fetchImpl, count } = countCalls(mockFetchFailThenSucceed(frierenFixture));
    const result = await searchJikan("frieren", "anime", new AbortController().signal, fetchImpl);
    expect(result.ok).toBe(true);
    expect(count()).toBe(2);
  });

  test("two consecutive failures still return ok:false after exactly one retry", async () => {
    const { fetchImpl, count } = countCalls(mockFetchJSON({ status: 504 }, 504));
    const result = await searchJikan("frieren", "anime", new AbortController().signal, fetchImpl);
    expect(result.ok).toBe(false);
    expect(count()).toBe(2);
  });
});

describe("resolveJikan", () => {
  // Criterion 6 (MAL half): resolving an AniList id against MAL must not
  // silently return Frieren. It returns not_found here — see the fixture's
  // own note on why 404 rather than a fabricated unrelated title.
  test("resolving an AniList id (154587) against MAL does not return Frieren", async () => {
    const result = await resolveJikan(154587, "anime", mockFetchJSON(notFoundFixture, 404));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_found");
  });
});

// D48 — Jikan nests genres as objects, so this maps `.name` out of them rather
// than passing the array through the way the AniList adapter can.
describe("searchJikan genres", () => {
  test("maps genres[].name out of Jikan's object shape", async () => {
    const result = await searchJikan(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON({
        data: [
          {
            mal_id: 52991,
            title: "Sousou no Frieren",
            title_english: "Frieren",
            title_japanese: null,
            images: {},
            year: 2023,
            score: 9.3,
            genres: [{ name: "Adventure" }, { name: "Drama" }, { name: "Fantasy" }],
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]!.genres).toEqual(["Adventure", "Drama", "Fantasy"]);
  });

  test("a response without a genres field yields [], never undefined", async () => {
    const result = await searchJikan(
      "frieren",
      "anime",
      new AbortController().signal,
      mockFetchJSON(frierenFixture),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]!.genres).toEqual([]);
  });
});
