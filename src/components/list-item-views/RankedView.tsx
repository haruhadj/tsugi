import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SourceLink } from "@/components/SourceLink";
import { GenreChip, hasScore, type Item } from "@/components/list-item-views/shared";
import type { MediaType, Provider } from "@/lib/types/media";

export function RankedView({
  items,
  activeGenre,
  onGenreSelect,
}: {
  items: Item[];
  activeGenre: string | null;
  onGenreSelect: (genre: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.position} className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="flex gap-4">
            <span className="flex w-8 shrink-0 items-center justify-center font-mono text-xl font-bold text-muted-foreground/50 tabular-nums">
              {item.position + 1}
            </span>

            {/*
              `min-w-0` is load-bearing, not defensive. The title below carries
              `truncate`, which sets `white-space: nowrap` — and a nowrap element's
              min-content width is its *entire* string. That measurement propagates
              up here, and a flex item defaults to `min-width: auto`, so without
              this the row cannot shrink below the width of its longest title and
              a 40-character name pushes the card past the article's edge (where
              `overflow-hidden` clips it). The `min-w-0` on the two nested divs is
              not enough on its own: those let the inner items shrink, but they do
              not reduce the min-content contribution handed to this ancestor.
            */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <MediaCover
                  src={item.coverImage}
                  title={item.title}
                  width={60}
                  height={90}
                  className="rounded-lg"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="truncate text-sm font-bold text-foreground">{item.title}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {hasScore(item) && (
                      <ScoreBadge
                        scoreRaw={item.scoreRaw}
                        scoreFormat={item.scoreFormat}
                        size="sm"
                      />
                    )}
                    <SourceLink
                      provider={item.provider as Provider}
                      mediaType={item.mediaType as MediaType}
                      externalId={item.externalId}
                      className="text-[10px] underline-offset-2 hover:text-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end">
                {item.genres.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {item.genres.slice(0, 3).map((genre) => (
                      <GenreChip
                        key={genre}
                        genre={genre}
                        active={activeGenre === genre}
                        onSelect={onGenreSelect}
                      />
                    ))}
                    {item.genres.length > 3 && (
                      <span className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-primary">
                        +{item.genres.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {item.comment && (
                  <p className="max-w-xs break-words text-right text-sm text-muted-foreground/80 italic">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
