import "server-only";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { OAuth2Tokens } from "better-auth/oauth2";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/auth-schema";
import { getEnv } from "@/lib/env";
import { sha256Base64Url } from "@/lib/pkce";
import { synthesizeTrackerEmail } from "@/lib/synthesize-tracker-email";

const env = getEnv();

type AniListViewer = {
  id: number;
  name: string;
  avatar: { large: string | null } | null;
  mediaListOptions: { scoreFormat: string } | null;
};

async function getAniListUserInfo(tokens: OAuth2Tokens) {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.accessToken}`,
    },
    body: JSON.stringify({
      query: `query { Viewer { id name avatar { large } mediaListOptions { scoreFormat } } }`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const body = (await response.json()) as { data?: { Viewer: AniListViewer | null } };
  const viewer = body.data?.Viewer;
  if (!viewer) return null;

  return {
    id: String(viewer.id),
    name: viewer.name,
    // AniList's User type has no email field at all (D25) — synthesise one.
    // Better-Auth's OAuth path does not validate this address.
    email: synthesizeTrackerEmail("anilist", String(viewer.id)),
    emailVerified: true,
    image: viewer.avatar?.large ?? undefined,
    // The scale this user rates in (D32) — read here so Phase 5 never has
    // to guess between a POINT_3 smiley strip and a POINT_100 field.
    scoreFormat: viewer.mediaListOptions?.scoreFormat ?? "POINT_10",
  };
}

type MalUser = {
  id: number;
  name: string;
  picture?: string;
};

async function getMalUserInfo(tokens: OAuth2Tokens) {
  // Every MAL v2 API call needs the client id, including authenticated ones
  // (tech-stack.md) — verified for the public search endpoint; unverified
  // for /users/@me specifically, since no MAL app exists yet to call it
  // live against (D30's named risk). Sent defensively; MAL ignores unknown
  // headers rather than rejecting them if this turns out to be unnecessary.
  const response = await fetch("https://api.myanimelist.net/v2/users/@me?fields=id,name,picture", {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "X-MAL-CLIENT-ID": env.MAL_CLIENT_ID,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const user = (await response.json()) as MalUser;
  if (!user.id) return null;

  return {
    id: String(user.id),
    name: user.name,
    // MAL's /users/@me does not return an email either (D25) — same
    // synthesis scheme as AniList.
    email: synthesizeTrackerEmail("mal", String(user.id)),
    emailVerified: true,
    image: user.picture,
    // MAL has one scale, always 10-point — no format field to read.
    scoreFormat: "POINT_10",
  };
}

// MAL supports code_challenge_method=plain ONLY — the challenge must equal
// the verifier (D30). Better-Auth's genericOAuth hard-codes S256 at the
// authorization step with no config knob to change it (verified by reading
// @better-auth/core's createAuthorizationURL). The escape hatch: declare
// `code_challenge_method: plain` via authorizationUrlParams (applied last,
// after the S256 default, so it overwrites only that one key — the
// `code_challenge` value is left as Better-Auth's own S256(verifier) hash),
// then in getToken recompute that same S256 hash from the raw verifier
// Better-Auth hands back and send THAT as `code_verifier`. MAL's plain-mode
// comparison is a byte-for-byte match against whatever it was given as the
// challenge, so this satisfies it without needing MAL to understand S256 at
// all. Verified locally: the constructed authorization URL does carry
// `code_challenge_method=plain` (curl against /api/auth/sign-in/oauth2).
// The token exchange itself is unverified end to end — no MAL app exists
// yet to sign in against (see the risk table in PHASE-2.md); this is the
// mechanism criterion 1 has to prove.

async function getMalToken(data: {
  code: string;
  redirectURI: string;
  codeVerifier?: string;
}): Promise<OAuth2Tokens> {
  if (!data.codeVerifier) {
    throw new Error("MAL token exchange is missing its PKCE code verifier");
  }
  const codeVerifier = await sha256Base64Url(data.codeVerifier);

  const response = await fetch("https://myanimelist.net/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MAL_CLIENT_ID,
      client_secret: env.MAL_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: data.code,
      redirect_uri: data.redirectURI,
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`MAL token exchange failed: ${response.status}`);
  }

  const body = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    tokenType: body.token_type,
    accessTokenExpiresAt: body.expires_in
      ? new Date(Date.now() + body.expires_in * 1000)
      : undefined,
  };
}

export const auth = betterAuth({
  // Despite Better-Auth's own startup warning claiming the origin is
  // "derived from the incoming request" when unset, it is not — verified
  // live: a request with Host: 192.168.1.5:3001 still produced
  // redirect_uri=http://localhost:3001/... A provider that validates the
  // registered redirect URI exactly (both of ours do) rejects that on
  // sight, so an explicit baseURL is not optional the moment sign-in is
  // tested from anywhere but the exact host Better-Auth assumes.
  // NEXT_PUBLIC_APP_URL already exists for this (originally reserved for
  // Phase 6's og:image); reused here rather than adding a second variable.
  baseURL: env.NEXT_PUBLIC_APP_URL,
  // The adapter does not introspect the schema `db` was constructed with —
  // it needs its own explicit reference to the four auth tables, or lookups
  // like "verification" fail with "model was not found in the schema
  // object" the first time any auth endpoint actually runs a query. Found
  // running the sign-in flow; Phase 1's round-trip tests never exercised
  // this because they queried the tables directly, not through the adapter.
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  // Without this, explicit linking fails with `email_doesn't_match` every
  // time — verified against the live MAL endpoint, 2026-08-11. The check
  // this disables (identical in callback.mjs, generic-oauth/routes.mjs, and
  // account.mjs) compares the linked provider's email against the signed-in
  // user's; ours are synthesised per (provider, externalId) (D25) and can
  // never match across AniList and MAL, so the default guard rejects every
  // legitimate link this product will ever perform. Safe to disable because
  // it only gates the *explicit*, already-authenticated linking path — the
  // dangerous case, matching-by-email at sign-in to auto-link strangers, is
  // a separate mechanism (`trustedProviders`) that D25 already keeps off.
  account: {
    accountLinking: {
      allowDifferentEmails: true,
    },
  },
  user: {
    additionalFields: {
      // The scale this user rates in — read from the session in Phase 5,
      // written at sign-in in Phase 2, refreshed on every list fetch in
      // Phase 7 (D32).
      scoreFormat: {
        type: "string",
        required: true,
        defaultValue: "POINT_10",
        input: false,
      },
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "anilist",
          clientId: env.ANILIST_CLIENT_ID,
          clientSecret: env.ANILIST_CLIENT_SECRET,
          authorizationUrl: "https://anilist.co/api/v2/oauth/authorize",
          tokenUrl: "https://anilist.co/api/v2/oauth/token",
          getUserInfo: getAniListUserInfo,
          // A repeat sign-in does not refresh the user row without this —
          // verified against 1.6.26's callback route (tech-stack.md). Without
          // it, a user who changes their AniList score format keeps the
          // stale value forever.
          overrideUserInfo: true,
        },
        {
          providerId: "mal",
          clientId: env.MAL_CLIENT_ID,
          clientSecret: env.MAL_CLIENT_SECRET,
          authorizationUrl: "https://myanimelist.net/v1/oauth2/authorize",
          tokenUrl: "https://myanimelist.net/v1/oauth2/token",
          pkce: true,
          authorizationUrlParams: { code_challenge_method: "plain" },
          getToken: getMalToken,
          getUserInfo: getMalUserInfo,
          overrideUserInfo: true,
        },
      ],
    }),
  ],
});

// For Server Components — an unauthenticated read returns null rather than
// throwing (PHASE-2.md criterion 8). Hono routes read the session directly
// via `auth.api.getSession({ headers: c.req.raw.headers })` instead; they
// already have a Headers object without Next's async headers() indirection.
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}
