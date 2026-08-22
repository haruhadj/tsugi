import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { setDummyEnv } from "@/lib/test/setDummyEnv";

// tokens.ts hits Postgres directly (no injectable db), so this is a true unit
// test only because @/db is mocked out below, before the module under test is
// imported. Anything that needs a real linked account's row shape end-to-end
// belongs in a .db.test.ts tier instead (see PHASE-7.md).
let accountRow: Record<string, unknown> | undefined;
let updatedWith: Record<string, unknown> | undefined;

mock.module("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (accountRow ? [accountRow] : []),
        }),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updatedWith = values;
        return { where: async () => {} };
      },
    }),
  },
}));

mock.module("@/db/auth-schema", () => ({ account: {}, user: {} }));

// tokens.ts also calls getEnv() at module load — see setDummyEnv's own comment.
setDummyEnv();
const { getListAccessToken } = await import("./tokens");

const originalFetch = global.fetch;

beforeEach(() => {
  accountRow = undefined;
  updatedWith = undefined;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("getListAccessToken", () => {
  test("no linked account returns ok:false, reason: not_linked", async () => {
    accountRow = undefined;
    const result = await getListAccessToken("user-1", "anilist");
    expect(result).toEqual({ ok: false, reason: "not_linked" });
  });

  test("an AniList token is returned as-is, regardless of expiry (no refresh flow)", async () => {
    accountRow = {
      id: "acct-1",
      accessToken: "anilist-token",
      accessTokenExpiresAt: new Date(Date.now() - 1_000_000),
      refreshToken: null,
    };
    const result = await getListAccessToken("user-1", "anilist");
    expect(result).toEqual({ ok: true, accessToken: "anilist-token" });
  });

  test("a non-expired MAL token is returned without refreshing", async () => {
    accountRow = {
      id: "acct-1",
      accessToken: "mal-token",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60_000),
      refreshToken: "refresh-token",
    };
    global.fetch = (async () => {
      throw new Error("should not have refreshed");
    }) as unknown as typeof fetch;

    const result = await getListAccessToken("user-1", "mal");
    expect(result).toEqual({ ok: true, accessToken: "mal-token" });
  });

  // The 60s expiry margin (EXPIRY_MARGIN_MS) means "expires in 30s" already
  // counts as expired, since it could die mid-request.
  test("a MAL token expiring within the 60s margin is treated as expired", async () => {
    accountRow = {
      id: "acct-1",
      accessToken: "stale-token",
      accessTokenExpiresAt: new Date(Date.now() + 30_000),
      refreshToken: "refresh-token",
    };
    global.fetch = (async () =>
      new Response(
        JSON.stringify({ access_token: "fresh-token", refresh_token: "fresh-refresh", expires_in: 3600 }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const result = await getListAccessToken("user-1", "mal");
    expect(result).toEqual({ ok: true, accessToken: "fresh-token" });
  });

  test("an expired MAL token with no refresh token returns ok:false, reason: reauth_required", async () => {
    accountRow = {
      id: "acct-1",
      accessToken: "stale-token",
      accessTokenExpiresAt: new Date(Date.now() - 1_000),
      refreshToken: null,
    };
    const result = await getListAccessToken("user-1", "mal");
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
  });

  test("an expired MAL token successfully refreshes, persists the new tokens, and returns the new access token", async () => {
    accountRow = {
      id: "acct-1",
      accessToken: "stale-token",
      accessTokenExpiresAt: new Date(Date.now() - 1_000),
      refreshToken: "refresh-token",
    };
    let sawBody = "";
    global.fetch = (async (_url: string, init?: RequestInit) => {
      sawBody = String(init?.body);
      return new Response(
        JSON.stringify({ access_token: "fresh-token", refresh_token: "fresh-refresh", expires_in: 3600 }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const result = await getListAccessToken("user-1", "mal");

    expect(result).toEqual({ ok: true, accessToken: "fresh-token" });
    expect(sawBody).toContain("grant_type=refresh_token");
    expect(sawBody).toContain("refresh_token=refresh-token");
    expect(updatedWith).toEqual({
      accessToken: "fresh-token",
      refreshToken: "fresh-refresh",
      accessTokenExpiresAt: expect.any(Date),
    });
  });

  // Criterion 7: a dead refresh token must surface as "reconnect", never as
  // a silent empty list.
  test("an expired MAL token whose refresh call fails (dead refresh token) returns ok:false, reason: reauth_required", async () => {
    accountRow = {
      id: "acct-1",
      accessToken: "stale-token",
      accessTokenExpiresAt: new Date(Date.now() - 1_000),
      refreshToken: "dead-refresh-token",
    };
    global.fetch = (async () => new Response("", { status: 400 })) as unknown as typeof fetch;

    const result = await getListAccessToken("user-1", "mal");
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
    expect(updatedWith).toBeUndefined();
  });
});
