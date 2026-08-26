import type { Provider } from "@/lib/types/media";

export const PROVIDER_LABELS: Record<Provider, string> = {
  anilist: "AniList",
  mal: "MyAnimeList",
};

export function otherProvider(provider: Provider): Provider {
  return provider === "anilist" ? "mal" : "anilist";
}
