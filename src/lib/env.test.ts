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
    };

    expect(() => validateEnv(source)).not.toThrow();
  });
});
