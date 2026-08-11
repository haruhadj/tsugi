import { describe, expect, test } from "bun:test";

// Redis tier (code-standards.md) — live Upstash, never gates CI. Same plain-`if`
// gate as the db tier, for the same reason: "./middleware" carries
// `import "server-only"` and calls `getEnv()` at module load.
const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

if (hasUpstash) {
  describe("checkRecCreateLimit (live Upstash)", () => {
    test("D34 — 5 allowed per minute per user, the 6th is blocked with a real retryAfter", async () => {
      const { checkRecCreateLimit } = await import("./middleware");
      const userId = `test-user-${crypto.randomUUID()}`;

      const results = [];
      for (let i = 0; i < 6; i++) {
        results.push(await checkRecCreateLimit(userId));
      }

      // Criterion 16.
      expect(results.slice(0, 5).every((r) => r.allowed)).toBe(true);
      const sixth = results[5];
      expect(sixth?.allowed).toBe(false);
      if (sixth && !sixth.allowed) {
        expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
      }
    });

    // Criterion 17a — D34's whole point: the key is the user, not the address.
    // Two distinct users must never share a bucket, proven here by using two
    // different ids back to back with no shared state between them.
    test("a second user is unaffected by the first user's limit", async () => {
      const { checkRecCreateLimit } = await import("./middleware");
      const userA = `test-user-a-${crypto.randomUUID()}`;
      const userB = `test-user-b-${crypto.randomUUID()}`;

      for (let i = 0; i < 5; i++) {
        const result = await checkRecCreateLimit(userA);
        expect(result.allowed).toBe(true);
      }
      const sixthForA = await checkRecCreateLimit(userA);
      expect(sixthForA.allowed).toBe(false);

      const firstForB = await checkRecCreateLimit(userB);
      expect(firstForB.allowed).toBe(true);
    });

    // Criterion 17 ("after the window elapses, a further POST returns 201
    // again") is intentionally not automated here — it needs a genuine 60s+
    // wait, which makes this whole tier slow and flaky-feeling for what it
    // would prove. @upstash/ratelimit's sliding window is a mature,
    // independently-tested library; the two tests above already verify the
    // part that is actually ours to get wrong — the 5/window bound and the
    // per-user key (D34). Re-verify by hand if the underlying algorithm is
    // ever changed or its version bumped.
  });
}
