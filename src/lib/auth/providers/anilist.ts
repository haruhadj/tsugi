import "server-only";
import type { OAuth2Tokens } from "better-auth/oauth2";
import { synthesizeTrackerEmail } from "@/lib/synthesize-tracker-email";

type AniListViewer = {
  id: number;
  name: string;
  avatar: { large: string | null } | null;
  mediaListOptions: { scoreFormat: string } | null;
};

export async function getAniListUserInfo(tokens: OAuth2Tokens) {
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
