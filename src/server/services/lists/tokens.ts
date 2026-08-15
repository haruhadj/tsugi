import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { account } from "@/db/auth-schema";
import { getEnv } from "@/lib/env";
import type { Provider } from "@/lib/types/media";

const env = getEnv();

// A 60s margin — the token could otherwise expire mid-request between this
// check and the provider actually receiving it.
const EXPIRY_MARGIN_MS = 60_000;

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() - EXPIRY_MARGIN_MS <= Date.now();
}

async function getAccountRow(userId: string, providerId: Provider) {
  const rows = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, providerId)))
    .limit(1);
  return rows[0];
}

/**
 * Refreshes a MAL access token (grant_type: refresh_token) — no such flow
 * existed before Phase 7. Returns null if the refresh token itself is dead,
 * which the caller must surface as "reconnect provider" (criterion 7), never
 * as an empty list.
 */
async function refreshMalToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  const response = await fetch("https://myanimelist.net/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MAL_CLIENT_ID,
      client_secret: env.MAL_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const body = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
  };
}

export type TokenLookupResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "not_linked" | "reauth_required" };

/**
 * Returns a live access token for (userId, provider), transparently
 * refreshing MAL's on expiry (criterion 6). AniList access tokens are
 * long-lived (~1 year) — no refresh flow exists for it, matching what Phase 2
 * actually implemented.
 */
export async function getListAccessToken(
  userId: string,
  provider: Provider,
): Promise<TokenLookupResult> {
  const row = await getAccountRow(userId, provider);
  if (!row?.accessToken) return { ok: false, reason: "not_linked" };

  if (provider === "anilist" || !isExpired(row.accessTokenExpiresAt)) {
    return { ok: true, accessToken: row.accessToken };
  }

  // provider === "mal" and the access token is expired.
  if (!row.refreshToken) return { ok: false, reason: "reauth_required" };

  const refreshed = await refreshMalToken(row.refreshToken);
  if (!refreshed) return { ok: false, reason: "reauth_required" };

  await db
    .update(account)
    .set({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      accessTokenExpiresAt: refreshed.expiresAt,
    })
    .where(eq(account.id, row.id));

  return { ok: true, accessToken: refreshed.accessToken };
}
