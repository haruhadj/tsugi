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

// D52: Cache schema version. Bump when ListEntry shape changes, or when a fetch
// bug is fixed, to force re-fetch of stale rows that predate the fix.
// v3: AniList entries cached before the media.id dedup in anilist.ts could
// carry the same title twice (once per AniList list it belonged to), which
// then collided on React's `provider-externalId` key in MyListPicker.
const CACHE_VERSION = 3;

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

/*
  Both params are pinned to their actual value sets with a regex. Unconstrained, this
  path is `/lists/:a/:b`, which swallows every other two-segment route under /lists —
  `/lists/:slug/comments` was being answered by this handler with "Sign in to import a
  list." Any new `/lists/<slug>/<something>` route would have hit the same wall.
*/
export const trackerListsRouter = new Hono().get(
  "/lists/:provider{anilist|mal}/:mediaType{anime|manga}",
  async (c) => {
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
      // D52: stale version forces a re-fetch once, then the row is current.
      if (cached && cached.version === CACHE_VERSION) {
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
        version: CACHE_VERSION,
      })
      .onConflictDoUpdate({
        target: [listCache.userId, listCache.provider, listCache.mediaType],
        set: { entries: result.data, fetchedAt: new Date(), version: CACHE_VERSION },
      });

    return c.json({ entries: result.data });
  },
);
