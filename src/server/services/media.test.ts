import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import frierenAniListResolveFixture from "@/lib/providers/__fixtures__/anilist-resolve-154587.json";
import notFoundFixture from "@/lib/providers/__fixtures__/jikan-resolve-154587-not-found.json";
import { mockFetchJSON, mockFetchReject } from "@/lib/providers/__fixtures__/mock-fetch";
import { resolveMedia } from "./media";

describe("resolveMedia", () => {
  // Criterion 5.
  test("resolveMedia('anilist', 154587, 'anime') returns ok:true with the correct title", async () => {
    const result = await resolveMedia(
      "anilist",
      154587,
      "anime",
      mockFetchJSON(frierenAniListResolveFixture),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe("Frieren: Beyond Journey’s End");
  });

  // Criterion 6 — the one this whole phase exists to get right (D15).
  test("resolveMedia('mal', 154587, 'anime') does not return Frieren", async () => {
    const result = await resolveMedia("mal", 154587, "anime", mockFetchJSON(notFoundFixture, 404));
    if (result.ok) {
      expect(result.data.title).not.toBe("Frieren: Beyond Journey’s End");
    } else {
      expect(result.ok).toBe(false);
    }
  });

  // Criterion 7, resolve side: forcing AniList to fail must never fall
  // through to a MAL-shaped success or vice versa.
  test("a forced failure returns ok:false and never the other provider's data", async () => {
    const result = await resolveMedia("anilist", 154587, "anime", mockFetchReject("TypeError"));
    expect(result.ok).toBe(false);
  });

  // Criterion 11 — a structural check on this exact file, not a behavioural one.
  test("criterion 11 — a single switch dispatches both adapters, no fall-through path", () => {
    const source = readFileSync(join(import.meta.dir, "media.ts"), "utf8");
    const switchMatches = source.match(/switch\s*\(provider\)/g);
    expect(switchMatches).toHaveLength(1);

    const caseMatches = source.match(/case\s+"(anilist|mal)":/g);
    expect(caseMatches?.sort()).toEqual(['case "anilist":', 'case "mal":']);
  });
});
