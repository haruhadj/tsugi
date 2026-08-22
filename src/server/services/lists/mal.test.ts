import { describe, expect, test } from "bun:test";
import { setDummyEnv } from "@/lib/test/setDummyEnv";
import type { ListStatus } from "@/lib/types/media";

setDummyEnv();
const { fetchMalList } = await import("./mal");

function mockFetchJSON(body: unknown, status = 200): typeof fetch {
  return (async (_url: string, init?: RequestInit) => {
    if (init?.signal?.aborted) {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      throw error;
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

function malEntry(overrides: Partial<{
  id: number;
  title: string;
  score: number;
  status: string;
  genres: string[];
  year: number;
}> = {}) {
  return {
    node: {
      id: overrides.id ?? 154587,
      title: overrides.title ?? "Frieren: Beyond Journey's End",
      alternative_titles: { ja: "葬送のフリーレン" },
      main_picture: { large: "https://example.invalid/large.jpg", medium: "https://example.invalid/medium.jpg" },
      genres: (overrides.genres ?? ["Fantasy", "Adventure"]).map((name) => ({ name })),
      start_season: { year: overrides.year ?? 2023 },
    },
    list_status: { score: overrides.score ?? 9, status: overrides.status ?? "completed" },
  };
}

describe("fetchMalList", () => {
  test("maps a rated entry with title, cover, and score (POINT_10)", async () => {
    const result = await fetchMalList(
      "token",
      "anime",
      mockFetchJSON({ data: [malEntry({ score: 9 })], paging: {} }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entry = result.data[0]!;
    expect(entry.provider).toBe("mal");
    expect(entry.externalId).toBe(154587);
    expect(entry.mediaType).toBe("anime");
    expect(entry.title).toBe("Frieren: Beyond Journey's End");
    expect(entry.coverImage).toBe("https://example.invalid/large.jpg");
    expect(entry.scoreRaw).toBe(9);
    expect(entry.scoreFormat).toBe("POINT_10");
  });

  // D35: 0 is MAL's "unrated" sentinel, not a zero rating.
  test("an entry scored 0 imports with scoreRaw and scoreFormat both null", async () => {
    const result = await fetchMalList(
      "token",
      "anime",
      mockFetchJSON({ data: [malEntry({ score: 0 })], paging: {} }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]!.scoreRaw).toBeNull();
    expect(result.data[0]!.scoreFormat).toBeNull();
  });

  test("a manga mediaType maps to the mangalist path and returns mediaType: manga", async () => {
    let requestedUrl = "";
    const fetchImpl = (async (url: string) => {
      requestedUrl = url;
      return new Response(JSON.stringify({ data: [malEntry()], paging: {} }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await fetchMalList("token", "manga", fetchImpl);

    expect(requestedUrl).toContain("/mangalist");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]!.mediaType).toBe("manga");
  });

  test("sends the bearer token and X-MAL-CLIENT-ID header on every request", async () => {
    let sawAuth = false;
    let sawClientId = false;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      sawAuth = headers?.Authorization === "Bearer my-token";
      sawClientId = typeof headers?.["X-MAL-CLIENT-ID"] === "string" && headers["X-MAL-CLIENT-ID"].length > 0;
      return new Response(JSON.stringify({ data: [], paging: {} }), { status: 200 });
    }) as unknown as typeof fetch;

    await fetchMalList("my-token", "anime", fetchImpl);

    expect(sawAuth).toBe(true);
    expect(sawClientId).toBe(true);
  });

  test("follows paging.next across multiple pages and concatenates results", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          JSON.stringify({
            data: [malEntry({ id: 1 })],
            paging: { next: "https://api.myanimelist.net/v2/users/@me/animelist?offset=100" },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ data: [malEntry({ id: 2 })], paging: {} }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await fetchMalList("token", "anime", fetchImpl);

    expect(calls).toBe(2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((e) => e.externalId)).toEqual([1, 2]);
  });

  test("a 401 response returns ok:false, reason: reauth_required", async () => {
    const result = await fetchMalList("token", "anime", mockFetchJSON({}, 401));
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
  });

  test("a 429 response returns ok:false, reason: rate_limited", async () => {
    const result = await fetchMalList("token", "anime", mockFetchJSON({}, 429));
    expect(result).toEqual({ ok: false, reason: "rate_limited" });
  });

  test("a network failure returns ok:false, reason: unavailable, rather than throwing", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    const result = await fetchMalList("token", "anime", fetchImpl);
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  test("a hung request settles within 9 seconds (adapter ceiling is 8s)", async () => {
    const fetchImpl = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          },
          { once: true },
        );
      })) as unknown as typeof fetch;

    const start = performance.now();
    const result = await fetchMalList("token", "anime", fetchImpl);
    expect(performance.now() - start).toBeLessThan(9_000);
    expect(result).toEqual({ ok: false, reason: "timeout" });
  }, 10_000);

  // D52: status, genres, year mapping tests
  test("maps status, genres, and year from MAL response", async () => {
    const result = await fetchMalList(
      "token",
      "anime",
      mockFetchJSON({ data: [malEntry({ status: "watching", genres: ["Action", "Drama"], year: 2024 })], paging: {} }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entry = result.data[0]!;
    expect(entry.status).toBe("current");
    expect(entry.genres).toEqual(["Action", "Drama"]);
    expect(entry.year).toBe(2024);
  });

  test("maps MAL anime and manga status values to unified ListStatus", async () => {
    const statusTests: { mal: string; expected: string }[] = [
      { mal: "watching", expected: "current" },
      { mal: "reading", expected: "current" },
      { mal: "plan_to_watch", expected: "planning" },
      { mal: "plan_to_read", expected: "planning" },
      { mal: "completed", expected: "completed" },
      { mal: "dropped", expected: "dropped" },
      { mal: "on_hold", expected: "paused" },
    ];

    for (const { mal, expected } of statusTests) {
      const result = await fetchMalList(
        "token",
        "anime",
        mockFetchJSON({ data: [malEntry({ status: mal })], paging: {} }),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data[0]!.status).toBe(expected as ListStatus);
    }
  });

  test("a missing status returns null, missing genres returns empty array", async () => {
    const entry = malEntry();
    delete (entry.list_status as { status?: string }).status;
    delete (entry.node as { genres?: unknown }).genres;

    const result = await fetchMalList("token", "anime", mockFetchJSON({ data: [entry], paging: {} }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]!.status).toBeNull();
    expect(result.data[0]!.genres).toEqual([]);
  });
});
