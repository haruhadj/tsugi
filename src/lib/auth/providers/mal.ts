import "server-only";
import type { OAuth2Tokens } from "better-auth/oauth2";
import { getEnv } from "@/lib/env";
import { sha256Base64Url } from "@/lib/pkce";
import { synthesizeTrackerEmail } from "@/lib/synthesize-tracker-email";

const env = getEnv();

type MalUser = {
  id: number;
  name: string;
  picture?: string;
};

export async function getMalUserInfo(tokens: OAuth2Tokens) {
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

export async function getMalToken(data: {
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
