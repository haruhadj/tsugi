import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SourceLink } from "@/components/SourceLink";
import type { RecommendationView } from "@/server/services/recommendations";
import type { MediaType, Provider } from "@/lib/types/media";
import type { ScoreFormat } from "@/lib/score";

export function RecView({ rec }: { rec: RecommendationView }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-2">
        {rec.caption && (
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-foreground">
            {rec.caption}
          </h1>
        )}
        {rec.comment && <p className="text-muted-foreground">{rec.comment}</p>}
      </header>

      <ul className="flex flex-col gap-6">
        {rec.items.map((item) => (
          <li key={item.position} className="flex gap-4">
            <MediaCover
              src={item.coverImage}
              title={item.title}
              width={96}
              height={144}
            />
            <div className="flex flex-1 flex-col gap-2">
              <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
              {item.scoreRaw !== null && item.scoreFormat !== null && (
                <ScoreBadge
                  scoreRaw={item.scoreRaw}
                  scoreFormat={item.scoreFormat as ScoreFormat}
                  className="w-fit"
                />
              )}
              {item.comment && <p className="text-sm text-muted-foreground">{item.comment}</p>}
              <SourceLink
                provider={item.provider as Provider}
                mediaType={item.mediaType as MediaType}
                externalId={item.externalId}
                className="text-sm text-primary underline-offset-4 hover:underline w-fit"
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
