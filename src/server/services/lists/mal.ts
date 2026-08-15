import "server-only";
import { getEnv } from "@/lib/env";
import type { ListEntry, MediaType, ProviderResult } from "@/lib/types/media";

const env = getEnv();

// MAL v2 caps list_status fields differently per media type — "list_status"
// alone returns { status, score, ... } for both, so one field set works here.
const FIELDS = "list_status";
const PAGE_LIMIT = 100;

function toPath(mediaType: MediaType): "animelist" | "mangalist" {
  return mediaType === "anime" ? "animelist" : "mangalist";
}

type MalNode = {
  id: number;
  title: string;
  alternative_titles?: { ja?: string | null };
  main_picture?: { large?: string | null; medium?: string | null };
};

type MalListStatus = { score: number };

type MalListEntry = { node: MalNode; list_status: MalListStatus };

type MalListResponse = {
  data?: MalListEntry[];
  paging?: { next?: string };
};

function pickTitle(node: MalNode): string {
  return node.title;
}

function toListEntry(entry: MalListEntry, mediaType: MediaType): ListEntry {
  // 0 is MAL's "unrated" sentinel too (D35), same as AniList.
  const isRated = entry.list_status.score !== 0;

  return {
    provider: "mal",
    externalId: entry.node.id,
    mediaType,
    title: pickTitle(entry.node),
    titleNative: entry.node.alternative_titles?.ja ?? null,
    coverImage: entry.node.main_picture?.large ?? entry.node.main_picture?.medium ?? null,
    // MAL scores are always POINT_10 (D28) — no per-user format to read.
    scoreRaw: isRated ? entry.list_status.score : null,
    scoreFormat: isRated ? "POINT_10" : null,
  };
}

async function getPage(
  url: string,
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<ProviderResult<MalListResponse>> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-MAL-CLIENT-ID": env.MAL_CLIENT_ID,
      },
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

/**
 * Fetches the authenticated MAL user's full list for `mediaType`, via their
 * stored OAuth token. Read-only, permanently (invariant + Phase 7
 * criterion 11) — this file must never issue a mutation.
 */
export async function fetchMalList(
  accessToken: string,
  mediaType: MediaType,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult<ListEntry[]>> {
  const entries: MalListEntry[] = [];
  let url: string | undefined =
    `https://api.myanimelist.net/v2/users/@me/${toPath(mediaType)}?fields=${FIELDS}&limit=${PAGE_LIMIT}`;

  while (url) {
    const result = await getPage(url, accessToken, fetchImpl);
    if (!result.ok) return result;

    entries.push(...(result.data.data ?? []));
    url = result.data.paging?.next;
  }

  return { ok: true, data: entries.map((entry) => toListEntry(entry, mediaType)) };
}
