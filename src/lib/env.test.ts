import { describe, expect, test } from "bun:test";
import { validateEnv } from "./env";

describe("validateEnv", () => {
  test("rejects a missing DATABASE_URL", () => {
    const source = {
      DIRECT_URL: "postgresql://user:pass@host:5432/db",
    };

    expect(() => validateEnv(source)).toThrow(/DATABASE_URL/);
  });

  test("accepts a complete environment", () => {
    const source = {
      DATABASE_URL: "postgresql://user:pass@host:6543/db",
      DIRECT_URL: "postgresql://user:pass@host:5432/db",
      BETTER_AUTH_SECRET: "secret",
      ANILIST_CLIENT_ID: "id",
      ANILIST_CLIENT_SECRET: "secret",
      MAL_CLIENT_ID: "id",
      MAL_CLIENT_SECRET: "secret",
      RESEND_API_KEY: "resend-key",
    };

    expect(() => validateEnv(source)).not.toThrow();
  });

  // D9: Upstash is optional at the env-shape layer — src/server/hono/middleware.ts
  // is what enforces "required in production", not this file.
  test("UPSTASH_REDIS_REST_URL/TOKEN are optional — absent entirely", () => {
    const source = {
      DATABASE_URL: "postgresql://user:pass@host:6543/db",
      DIRECT_URL: "postgresql://user:pass@host:5432/db",
      BETTER_AUTH_SECRET: "secret",
      ANILIST_CLIENT_ID: "id",
      ANILIST_CLIENT_SECRET: "secret",
      MAL_CLIENT_ID: "id",
      MAL_CLIENT_SECRET: "secret",
      RESEND_API_KEY: "resend-key",
    };

    const env = validateEnv(source);
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined();
  });

  test("an empty-string UPSTASH_REDIS_REST_URL normalises to undefined, same as absent", () => {
    const source = {
      DATABASE_URL: "postgresql://user:pass@host:6543/db",
      DIRECT_URL: "postgresql://user:pass@host:5432/db",
      BETTER_AUTH_SECRET: "secret",
      ANILIST_CLIENT_ID: "id",
      ANILIST_CLIENT_SECRET: "secret",
      MAL_CLIENT_ID: "id",
      MAL_CLIENT_SECRET: "secret",
      RESEND_API_KEY: "resend-key",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    };

    const env = validateEnv(source);
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined();
  });

  test("a real UPSTASH_REDIS_REST_URL/TOKEN pass through unchanged", () => {
    const source = {
      DATABASE_URL: "postgresql://user:pass@host:6543/db",
      DIRECT_URL: "postgresql://user:pass@host:5432/db",
      BETTER_AUTH_SECRET: "secret",
      ANILIST_CLIENT_ID: "id",
      ANILIST_CLIENT_SECRET: "secret",
      MAL_CLIENT_ID: "id",
      MAL_CLIENT_SECRET: "secret",
      RESEND_API_KEY: "resend-key",
      UPSTASH_REDIS_REST_URL: "https://fit-hyena-107044.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "some-token",
    };

    const env = validateEnv(source);
    expect(env.UPSTASH_REDIS_REST_URL).toBe("https://fit-hyena-107044.upstash.io");
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBe("some-token");
  });

  test("EMAIL_FROM falls back to the Resend shared sender when absent", () => {
    const source = {
      DATABASE_URL: "postgresql://user:pass@host:6543/db",
      DIRECT_URL: "postgresql://user:pass@host:5432/db",
      BETTER_AUTH_SECRET: "secret",
      ANILIST_CLIENT_ID: "id",
      ANILIST_CLIENT_SECRET: "secret",
      MAL_CLIENT_ID: "id",
      MAL_CLIENT_SECRET: "secret",
      RESEND_API_KEY: "resend-key",
    };

    const env = validateEnv(source);
    expect(env.EMAIL_FROM).toBe("Tsugi <onboarding@resend.dev>");
  });

  test("a real EMAIL_FROM passes through unchanged", () => {
    const source = {
      DATABASE_URL: "postgresql://user:pass@host:6543/db",
      DIRECT_URL: "postgresql://user:pass@host:5432/db",
      BETTER_AUTH_SECRET: "secret",
      ANILIST_CLIENT_ID: "id",
      ANILIST_CLIENT_SECRET: "secret",
      MAL_CLIENT_ID: "id",
      MAL_CLIENT_SECRET: "secret",
      RESEND_API_KEY: "resend-key",
      EMAIL_FROM: "Tsugi <hello@tsugi.app>",
    };

    const env = validateEnv(source);
    expect(env.EMAIL_FROM).toBe("Tsugi <hello@tsugi.app>");
  });
});
