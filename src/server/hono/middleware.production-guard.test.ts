import { describe, expect, test } from "bun:test";

// Criterion 23 (D9) — deliberately not run inline in this process. Mutating
// process.env.NODE_ENV inside a shared Bun test run risks leaking into
// unrelated tests running in the same process, and "does importing this
// module throw" is exactly the kind of startup behaviour a subprocess
// proves honestly: a clean environment, one specific thing missing.
//
// Gated on the full env being present for everything OTHER than Upstash —
// this test's whole point is Upstash being *absent*, so it cannot be gated
// on hasUpstash the way middleware.redis.test.ts is.
const hasNonUpstashEnv = Boolean(
  process.env.DATABASE_URL &&
    process.env.DIRECT_URL &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.ANILIST_CLIENT_ID &&
    process.env.ANILIST_CLIENT_SECRET &&
    process.env.MAL_CLIENT_ID &&
    process.env.MAL_CLIENT_SECRET,
);

if (hasNonUpstashEnv) {
  describe("rate limiter production guard (D9, subprocess)", () => {
    test("importing the module throws when NODE_ENV=production and Upstash is unset", async () => {
      // --no-env-file is load-bearing: Bun's automatic .env loading
      // otherwise restores the real UPSTASH_* values into this subprocess
      // regardless of the empty strings passed via `env` below, silently
      // defeating the whole point of the test (confirmed by running it
      // without the flag first — it passed for the wrong reason).
      const proc = Bun.spawn({
        cmd: [
          "bun",
          "--no-env-file",
          "--conditions=react-server",
          "-e",
          `await import("${new URL("./middleware.ts", import.meta.url).pathname}")`,
        ],
        env: {
          ...process.env,
          NODE_ENV: "production",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
        },
        stderr: "pipe",
        stdout: "pipe",
      });

      const exitCode = await proc.exited;
      const stderr = await new Response(proc.stderr).text();

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("UPSTASH_REDIS_REST_URL");
      expect(stderr).toContain("required when NODE_ENV=production");
    });

    test("importing the module does not throw when NODE_ENV=production and Upstash is set", async () => {
      const proc = Bun.spawn({
        cmd: [
          "bun",
          "--conditions=react-server",
          "-e",
          `await import("${new URL("./middleware.ts", import.meta.url).pathname}"); console.log("ok")`,
        ],
        env: { ...process.env, NODE_ENV: "production" },
        stderr: "pipe",
        stdout: "pipe",
      });

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();

      expect(exitCode).toBe(0);
      expect(stdout).toContain("ok");
    });
  });
}
