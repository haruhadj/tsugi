import { describe, expect, test } from "bun:test";

// Live-database tier (D22) — skips itself when the environment this module
// needs isn't present, same plain-`if` pattern as schema.db.test.ts and for
// the same reason: "./auth" transitively imports "server-only" via "@/db",
// which throws unconditionally under a plain Bun require unless the
// react-server export condition is set (`--conditions=react-server`).
// Registering the describe() block at all would run that import even when
// this tier is meant to be invisible to CI.
//
// Gated on more than DATABASE_URL, unlike the schema tier — "./auth" calls
// getEnv() at module load and throws on any missing var, not just a missing
// database, so a half-configured .env must skip this tier rather than crash
// the whole test file.
const hasFullAuthEnv = Boolean(
  process.env.DATABASE_URL &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.ANILIST_CLIENT_ID &&
    process.env.ANILIST_CLIENT_SECRET &&
    process.env.MAL_CLIENT_ID &&
    process.env.MAL_CLIENT_SECRET,
);

if (hasFullAuthEnv) {
  describe("auth (live Supabase)", () => {
    let auth: (typeof import("./auth"))["auth"];

    test("PHASE-2.md criterion 8 — an unauthenticated read returns null, not a throw", async () => {
      ({ auth } = await import("./auth"));

      // No cookie at all is the actual signed-out shape a server component
      // sees; there is nothing to forge here — Better-Auth's own session
      // lookup is what has to return null, and it needs no session row to
      // do that correctly.
      const session = await auth.api.getSession({ headers: new Headers() });

      expect(session).toBeNull();
    });
  });
}
