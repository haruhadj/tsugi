import type { MediaType, Provider } from "@/lib/types/media";
import { buildSourceUrl } from "@/lib/source-url";

const PROVIDER_LABELS: Record<Provider, string> = {
  anilist: "AniList",
  mal: "MyAnimeList",
};

export function SourceLink({
  provider,
  mediaType,
  externalId,
  className,
}: {
  provider: Provider;
  mediaType: MediaType;
  externalId: number;
  className?: string;
}) {
  return (
    <a
      href={buildSourceUrl(provider, mediaType, externalId)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      View on {PROVIDER_LABELS[provider]}
    </a>
  );
}
