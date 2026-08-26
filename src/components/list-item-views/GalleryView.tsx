import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SourceLink } from "@/components/SourceLink";
import { GenreChip, hasScore, type Item } from "@/components/list-item-views/shared";
import type { MediaType, Provider } from "@/lib/types/media";

export function GalleryView({
  items,
  activeGenre,
  onGenreSelect,
}: {
  items: Item[];
  activeGenre: string | null;
  onGenreSelect: (genre: string) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <li
          key={item.position}
          className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50"
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary">
            <MediaCover
              src={item.coverImage}
              title={item.title}
              width={300}
              height={450}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Rank is the list's own ordering, so it is `position` — not the filtered index. */}
            <div className="absolute top-2 left-2 rounded-md border border-border bg-background/80 px-2 py-0.5 font-mono text-xs font-bold text-primary backdrop-blur-sm tabular-nums">
              #{item.position + 1}
            </div>

            {hasScore(item) && (
              <div className="absolute top-2 right-2">
                <ScoreBadge scoreRaw={item.scoreRaw} scoreFormat={item.scoreFormat} size="sm" />
              </div>
            )}
          </div>

          <div className="space-y-1 bg-card p-3">
            <h4 className="line-clamp-1 text-xs font-bold text-foreground">{item.title}</h4>
            {item.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {item.genres.slice(0, 2).map((genre) => (
                  <GenreChip
                    key={genre}
                    genre={genre}
                    active={activeGenre === genre}
                    onSelect={onGenreSelect}
                  />
                ))}
              </div>
            )}
            {item.comment && (
              <p className="line-clamp-2 border-t border-border/60 pt-1 text-[11px] text-muted-foreground italic">
                &ldquo;{item.comment}&rdquo;
              </p>
            )}
            <SourceLink
              provider={item.provider as Provider}
              mediaType={item.mediaType as MediaType}
              externalId={item.externalId}
              className="block text-[10px] text-muted-foreground underline-offset-2 hover:text-primary"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
