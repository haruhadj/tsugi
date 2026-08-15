import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import type { ListEntry, MediaType, ProviderResult } from "@/lib/types/media";
import type { ScoreFormat } from "@/lib/score";

const ENDPOINT = "https://graphql.anilist.co";

const VIEWER_QUERY = `
  query {
    Viewer { id mediaListOptions { scoreFormat } }
  }
`;

// MediaListCollection has no "current viewer" form — it takes a concrete
// userId, which AniList's own numeric id, not ours, and is not resolvable
// in the same request as Viewer. Hence the two-call shape below.
const LIST_QUERY = `
  query ($userId: Int, $type: MediaType) {
    MediaListCollection(userId: $userId, type: $type) {
      lists {
        entries {
          score
          media {
            id
            type
            title { english romaji native }
            coverImage { extraLarge large }
          }
        }
      }
    }
  }
`;

type AniListListEntry = {
  score: number;
  media: {
    id: number;
    type: "ANIME" | "MANGA";
    title: { english: string | null; romaji: string | null; native: string | null };
    coverImage: { extraLarge: string | null; large: string | null } | null;
  };
};

type AniListViewerResponse = {
  data?: { Viewer?: { id?: number; mediaListOptions?: { scoreFormat?: ScoreFormat } } | null };
};

type AniListListResponse = {
  data?: { MediaListCollection?: { lists?: { entries?: AniListListEntry[] }[] } | null };
};

function toMediaType(type: "ANIME" | "MANGA"): MediaType {
  return type === "ANIME" ? "anime" : "manga";
}

// Mirrors anilist-client.ts's pickTitle — kept as a separate copy rather than
// a shared import because the two adapters' raw response shapes are only
// coincidentally identical today, not guaranteed to stay that way.
function pickTitle(title: AniListListEntry["media"]["title"]): string {
  return title.english ?? title.romaji ?? title.native ?? "Untitled";
}

function toListEntry(entry: AniListListEntry, scoreFormat: ScoreFormat): ListEntry {
  const { media } = entry;
  // 0 is AniList's "unrated" sentinel, not a zero rating (D35).
  const isRated = entry.score !== 0;

  return {
    provider: "anilist",
    externalId: media.id,
    mediaType: toMediaType(media.type),
    title: pickTitle(media.title),
    titleNative: media.title.native,
    coverImage: media.coverImage?.extraLarge ?? media.coverImage?.large ?? null,
    scoreRaw: isRated ? entry.score : null,
    scoreFormat: isRated ? scoreFormat : null,
  };
}

/**
 * Fetches the authenticated AniList user's full list for `mediaType`, via
 * their stored OAuth token. Read-only, permanently (invariant + Phase 7
 * criterion 11) — this file must never issue a mutation.
 */
async function postGraphQL(
  body: unknown,
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<ProviderResult<unknown>> {
  let response: Response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "unavailable" };
  }

  if (response.status === 401) return { ok: false, reason: "reauth_required" };
  if (response.status === 429) return { ok: false, reason: "rate_limited" };
  if (!response.ok) return { ok: false, reason: "unavailable" };

  try {
    return { ok: true, data: await response.json() };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function fetchAniListList(
  userId: string,
  accessToken: string,
  mediaType: MediaType,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<ListEntry[]>> {
  const viewerResult = await postGraphQL({ query: VIEWER_QUERY }, accessToken, fetchImpl);
  if (!viewerResult.ok) return viewerResult;

  const viewerBody = viewerResult.data as AniListViewerResponse;
  const aniListUserId = viewerBody.data?.Viewer?.id;
  const scoreFormat = viewerBody.data?.Viewer?.mediaListOptions?.scoreFormat;
  if (!aniListUserId || !scoreFormat) return { ok: false, reason: "unavailable" };

  // D32: capture the viewer's current score format on every fetch, since it
  // is a user preference that can change, and write it back so the create
  // screen's score input picks up the change too.
  await db.update(user).set({ scoreFormat }).where(eq(user.id, userId));

  const listResult = await postGraphQL(
    {
      query: LIST_QUERY,
      variables: { userId: aniListUserId, type: mediaType === "anime" ? "ANIME" : "MANGA" },
    },
    accessToken,
    fetchImpl,
  );
  if (!listResult.ok) return listResult;

  const listBody = listResult.data as AniListListResponse;
  const lists = listBody.data?.MediaListCollection?.lists;
  if (!lists) return { ok: false, reason: "unavailable" };

  const entries = lists.flatMap((list) => list.entries ?? []);
  return { ok: true, data: entries.map((entry) => toListEntry(entry, scoreFormat)) };
}
