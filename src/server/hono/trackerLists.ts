import "server-only";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "@/db";
import { listCache } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { ListEntry, MediaType, Provider, ProviderResult } from "@/lib/types/media";
import { fetchAniListList } from "@/server/services/lists/anilist";
import { fetchMalList } from "@/server/services/lists/mal";
import { getListAccessToken } from "@/server/services/lists/tokens";

function isProvider(value: string): value is Provider {
  return value === "anilist" || value === "mal";
}

function isMediaType(value: string): value is MediaType {
  return value === "anime" || value === "manga";
}

// Never 401 the browser session-check failure into a "reconnect provider"
// reason — those are distinct axes (invariant: token fields never reach the
// client either way).
const REASON_STATUS: Record<
  Exclude<ProviderResult<unknown>, { ok: true }>["reason"],
  400 | 404 | 409 | 429 | 502 | 504
> = {
  timeout: 504,
  rate_limited: 429,
  unavailable: 502,
  not_found: 404,
  reauth_required: 409,
};

export const trackerListsRouter = new Hono().get("/lists/:provider/:mediaType", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Sign in to import a list." }, 401);
  }

  const providerParam = c.req.param("provider");
  const mediaTypeParam = c.req.param("mediaType");
  if (!isProvider(providerParam) || !isMediaType(mediaTypeParam)) {
    return c.json({ error: "Unknown provider or media type." }, 400);
  }

  const force = c.req.query("refresh") === "1";

  if (!force) {
    const cached = await db.query.listCache.findFirst({
      where: and(
        eq(listCache.userId, session.user.id),
        eq(listCache.provider, providerParam),
        eq(listCache.mediaType, mediaTypeParam),
      ),
    });
    if (cached) {
      return c.json({ entries: cached.entries as ListEntry[] });
    }
  }

  const token = await getListAccessToken(session.user.id, providerParam);
  if (!token.ok) {
    return c.json(
      { error: "Reconnect this provider to import your list." },
      token.reason === "not_linked" ? 404 : 409,
    );
  }

  const result =
    providerParam === "anilist"
      ? await fetchAniListList(session.user.id, token.accessToken, mediaTypeParam)
      : await fetchMalList(token.accessToken, mediaTypeParam);

  if (!result.ok) {
    if (force) {
      const stale = await db.query.listCache.findFirst({
        where: and(
          eq(listCache.userId, session.user.id),
          eq(listCache.provider, providerParam),
          eq(listCache.mediaType, mediaTypeParam),
        ),
      });
      if (stale) {
        return c.json({ entries: stale.entries as ListEntry[], stale: true });
      }
    }
    return c.json({ error: "Could not load your list." }, REASON_STATUS[result.reason]);
  }

  await db
    .insert(listCache)
    .values({
      userId: session.user.id,
      provider: providerParam,
      mediaType: mediaTypeParam,
      entries: result.data,
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [listCache.userId, listCache.provider, listCache.mediaType],
      set: { entries: result.data, fetchedAt: new Date() },
    });

  return c.json({ entries: result.data });
});
