import type { MediaType, Provider } from "@/lib/types/media";

const SOURCE_URL_BUILDERS: Record<Provider, (mediaType: MediaType, externalId: number) => string> = {
  anilist: (mediaType, externalId) => `https://anilist.co/${mediaType}/${externalId}`,
  mal: (mediaType, externalId) => `https://myanimelist.net/${mediaType}/${externalId}`,
};

export function buildSourceUrl(
  provider: Provider,
  mediaType: MediaType,
  externalId: number,
): string {
  return SOURCE_URL_BUILDERS[provider](mediaType, externalId);
}
