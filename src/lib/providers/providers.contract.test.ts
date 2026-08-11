import { describe, expect, test } from "bun:test";
import { resolveAniList, searchAniList } from "./anilist-client";
import { resolveJikan, searchJikan } from "./jikan-client";

// Contract tier (code-standards.md) — hits live AniList and Jikan, never gates
// CI. Exclusion is by runtime skip (D22's pattern), not by filename alone,
// because a plain `bun test --conditions=react-server` with no filter would
// otherwise pick this file up along with everything else. Unlike the db
// tier, presence of `.env` must NOT be enough to trigger this — AniList's
// 30/min budget is shared with the developer's own browser, so this tier
// needs a deliberate opt-in, not an ambient one.
//
// Run deliberately with:
//   RUN_CONTRACT_TESTS=1 bun test --conditions=react-server src/lib/providers/providers.contract.test.ts
//
// When a case here fails, the fix is usually an update to tech-stack.md, not
// to the adapter — that is what this tier exists to catch.
const runContractTests = process.env.RUN_CONTRACT_TESTS === "1";

if (runContractTests) {
  describe("AniList contract", () => {
    test("live search for 'frieren' returns the recorded id and title", async () => {
      const result = await searchAniList("frieren", "anime", new AbortController().signal);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const first = result.data[0];
      expect(first?.externalId).toBe(154587);
      expect(first?.title).toBe("Frieren: Beyond Journey’s End");
    });

    test("live resolve of id 154587 still returns Frieren", async () => {
      const result = await resolveAniList(154587, "anime");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.title).toBe("Frieren: Beyond Journey’s End");
    });

    test("resolving AniList's id against a mismatched type still fails safely", async () => {
      // 154587 is Frieren the anime; asking for it as manga must not return
      // Frieren under the wrong mediaType (D15's invariant, live).
      const result = await resolveAniList(154587, "manga");
      if (result.ok) {
        expect(result.data.mediaType).toBe("manga");
      } else {
        expect(result.ok).toBe(false);
      }
    });
  });

  describe("Jikan contract", () => {
    // Jikan fails roughly half the time by design (tech-stack.md) — a 504 is
    // a passing result for this test, not a failure. Only an actual thrown
    // exception or a malformed ok:true would be a real regression.
    test("live search for 'frieren' either succeeds with MAL's id or fails safely", async () => {
      const result = await searchJikan("frieren", "anime", new AbortController().signal);
      if (result.ok) {
        expect(result.data[0]?.externalId).toBe(52991);
      } else {
        expect(["unavailable", "timeout", "rate_limited"]).toContain(result.reason);
      }
    });

    test("live resolve of AniList's id (154587) against MAL never returns Frieren", async () => {
      const result = await resolveJikan(154587, "anime");
      if (result.ok) {
        expect(result.data.title).not.toBe("Frieren: Beyond Journey’s End");
      } else {
        expect(result.ok).toBe(false);
      }
    });
  });
}
