import { mock } from "bun:test";
import type { Env } from "@/lib/env";

const DUMMY_ENV: Env = {
  DATABASE_URL: "postgresql://user:pass@host:5432/db",
  DIRECT_URL: "postgresql://user:pass@host:5432/db",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-secret",
  ANILIST_CLIENT_ID: "test-anilist-client-id",
  ANILIST_CLIENT_SECRET: "test-anilist-client-secret",
  MAL_CLIENT_ID: "test-mal-client-id",
  MAL_CLIENT_SECRET: "test-mal-client-secret",
  RESEND_API_KEY: "test-resend-api-key",
  EMAIL_FROM: "Tsugi <onboarding@resend.dev>",
  UPSTASH_REDIS_REST_URL: undefined,
  UPSTASH_REDIS_REST_TOKEN: undefined,
};

// Some modules call getEnv() at import time (their choice, not env.ts's —
// see env.ts's own lazy-getEnv comment). CI runs with no .env at all (D22),
// so any unit test that transitively imports one of those modules needs
// getEnv() to resolve or module load throws before a single test executes.
//
// This mocks "@/lib/env" itself rather than setting process.env, because the
// .db.test.ts / .redis.test.ts tiers gate themselves on real process.env
// values (e.g. `Boolean(process.env.DATABASE_URL)`) — mutating process.env
// here would falsely flip those gates on for every later test file sharing
// this process. Call this — then use a dynamic `await import(...)` for the
// module under test, since a static import is hoisted above this call and
// would throw first.
export function setDummyEnv(): void {
  mock.module("@/lib/env", () => ({
    getEnv: () => DUMMY_ENV,
    validateEnv: () => DUMMY_ENV,
  }));
}
