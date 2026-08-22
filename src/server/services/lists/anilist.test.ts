import { describe, expect, test } from "bun:test";
import { fetchAniListList } from "./anilist";
import type { ListStatus } from "@/lib/types/media";

function viewerBody(overrides: Partial<{ id: number; scoreFormat: string }> = {}) {
  return {
    data: {
      Viewer: {
        id: overrides.id ?? 42,
        mediaListOptions: { scoreFormat: overrides.scoreFormat ?? "POINT_10" },
      },
    },
  };
}

function listBody(entries: unknown[]) {
  return { data: { MediaListCollection: { lists: [{ entries }] } } };
}

function aniListEntry(overrides: Partial<{
  id: number;
  type: "ANIME" | "MANGA";
  score: number;
  status: string | null;
  genres: string[] | null;
  year: number | null;
}> = {}) {
  return {
    status: overrides.status ?? "COMPLETED",
    score: overrides.score ?? 8,
    media: {
      id: overrides.id ?? 154587,
      type: overrides.type ?? "ANIME",
      title: { english: "Frieren: Beyond Journey's End", romaji: "Sousou no Frieren", native: "葬送のフリーレン" },
      coverImage: { extraLarge: "https://example.invalid/xl.jpg", large: "https://example.invalid/large.jpg" },
      genres: overrides.genres ?? ["Fantasy", "Adventure"],
      startDate: { year: overrides.year ?? 2023 },
    },
  };
}

function mockSequence(responses: { body: unknown; status?: number }[]): typeof fetch {
  let call = 0;
  return (async (_url: string, init?: RequestInit) => {
    if (init?.signal?.aborted) {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      throw error;
    }
    const response = responses[Math.min(call, responses.length - 1)]!;
    call += 1;
    return new Response(JSON.stringify(response.body), {
      status: response.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

// db writes (D32 write-back) happen against a real Postgres connection that
// isn't available in this unit tier — these tests only exercise fetch/mapping
// behaviour up to the point the db call would occur, which is why every
// scoreFormat/query fixture below deliberately avoids reaching it: they're
// var'd out by making the second (list) call fail before the code path here
// runs the update. Full write-back coverage is folded into exit criterion 2,
// a db-tier test against a real linked account (see PHASE-7.md).

describe("fetchAniListList", () => {
  test("sends the bearer token in the Authorization header on every request", async () => {
    let sawAuth = false;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      sawAuth = headers?.Authorization === "Bearer my-token";
      return new Response(JSON.stringify({}), { status: 401 });
    }) as unknown as typeof fetch;

    await fetchAniListList("user-1", "my-token", "anime", fetchImpl);
    expect(sawAuth).toBe(true);
  });

  test("a 401 on the viewer call returns ok:false, reason: reauth_required", async () => {
    const result = await fetchAniListList("user-1", "token", "anime", mockSequence([{ body: {}, status: 401 }]));
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
  });

  test("a 429 on the viewer call returns ok:false, reason: rate_limited", async () => {
    const result = await fetchAniListList("user-1", "token", "anime", mockSequence([{ body: {}, status: 429 }]));
    expect(result).toEqual({ ok: false, reason: "rate_limited" });
  });

  test("a missing viewer id or scoreFormat returns ok:false, reason: unavailable", async () => {
    const result = await fetchAniListList(
      "user-1",
      "token",
      "anime",
      mockSequence([{ body: { data: { Viewer: {} } } }]),
    );
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  test("a network failure on the viewer call returns ok:false, reason: unavailable, rather than throwing", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    const result = await fetchAniListList("user-1", "token", "anime", fetchImpl);
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  test("a hung viewer request settles within 9 seconds (adapter ceiling is 8s)", async () => {
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
    const result = await fetchAniListList("user-1", "token", "anime", fetchImpl);
    expect(performance.now() - start).toBeLessThan(9_000);
    expect(result).toEqual({ ok: false, reason: "timeout" });
  }, 10_000);

  test("a malformed (non-JSON) viewer response returns ok:false, reason: unavailable", async () => {
    const fetchImpl = (async () =>
      new Response("not json", { status: 200 })) as unknown as typeof fetch;

    const result = await fetchAniListList("user-1", "token", "anime", fetchImpl);
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  // D52: status, genres, year mapping tests
  test("maps status, genres, and year from AniList response", async () => {
    const result = await fetchAniListList(
      "user-1",
      "token",
      "anime",
      mockSequence([
        { body: viewerBody() },
        { body: listBody([aniListEntry({ status: "CURRENT", genres: ["Action", "Drama"], year: 2024 })]) },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entry = result.data[0]!;
    expect(entry.status).toBe("current");
    expect(entry.genres).toEqual(["Action", "Drama"]);
    expect(entry.year).toBe(2024);
  });

  test("maps all AniList status values to unified ListStatus", async () => {
    const statusTests: { anilist: string; expected: string }[] = [
      { anilist: "CURRENT", expected: "current" },
      { anilist: "PLANNING", expected: "planning" },
      { anilist: "COMPLETED", expected: "completed" },
      { anilist: "DROPPED", expected: "dropped" },
      { anilist: "PAUSED", expected: "paused" },
      { anilist: "REPEATING", expected: "repeating" },
    ];

    for (const { anilist, expected } of statusTests) {
      const result = await fetchAniListList(
        "user-1",
        "token",
        "anime",
        mockSequence([
          { body: viewerBody() },
          { body: listBody([aniListEntry({ status: anilist })]) },
        ]),
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data[0]!.status).toBe(expected as ListStatus);
    }
  });

  test("a missing status returns null, missing genres returns empty array", async () => {
    const entry = aniListEntry();
    delete (entry as { status?: string }).status;
    delete (entry.media as { genres?: string[] }).genres;

    const result = await fetchAniListList(
      "user-1",
      "token",
      "anime",
      mockSequence([
        { body: viewerBody() },
        { body: listBody([entry]) },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0]!.status).toBeNull();
    expect(result.data[0]!.genres).toEqual([]);
  });

  test("dedupes a media that appears in multiple lists by media id", async () => {
    // AniList returns the same media in its status list and any custom lists;
    // flatMap would otherwise yield duplicate externalIds and collide React keys.
    const duped = {
      data: {
        MediaListCollection: {
          lists: [
            { entries: [aniListEntry({ id: 110277 }), aniListEntry({ id: 190704 })] },
            { entries: [aniListEntry({ id: 110277 })] },
          ],
        },
      },
    };

    const result = await fetchAniListList(
      "user-1",
      "token",
      "anime",
      mockSequence([{ body: viewerBody() }, { body: duped }]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((e) => e.externalId)).toEqual([110277, 190704]);
  });
});
