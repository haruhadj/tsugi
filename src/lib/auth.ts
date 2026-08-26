import "server-only";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/auth-schema";
import { deriveDefaultUsername } from "@/lib/auth/username";
import { getAniListUserInfo } from "@/lib/auth/providers/anilist";
import { getMalToken, getMalUserInfo } from "@/lib/auth/providers/mal";
import { sendResetPasswordEmail, sendVerificationEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";

const env = getEnv();

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
  // Email + username sign-in, alongside the two tracker OAuth providers.
  // `account.password` and the `verification` table already existed —
  // they're part of better-auth's core schema, unused until now.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  databaseHooks: {
    user: {
      create: {
        // Fires only at first-ever row creation — independent of
        // genericOAuth's overrideUserInfo, which keeps refreshing
        // name/image/scoreFormat on every later sign-in without touching
        // username (D42, Phase B).
        before: async (newUser) => {
          const username = await deriveDefaultUsername(newUser.name, newUser.id);
          return { data: { ...newUser, username } };
        },
      },
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
      // Defaulted once at signup (deriveDefaultUsername above), then freely
      // editable in Settings (src/server/hono/user.ts) — input: false keeps
      // better-auth's own update-user path from touching it; that route is
      // never called for it, all writes go through updateUsername.
      username: {
        type: "string",
        required: false,
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
