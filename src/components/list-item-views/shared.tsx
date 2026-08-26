import type { ScoreFormat } from "@/lib/score";
import type { ListView } from "@/server/services/lists";
import { cn } from "@/lib/utils";
import { MediaCover } from "@/components/MediaCover";
import { SourceLink } from "@/components/SourceLink";
import type { MediaType, Provider } from "@/lib/types/media";

export type Item = ListView["items"][number];

/** An item whose score is safe to render: both halves of the pair are present (invariant 6). */
export type ScoredItem = Item & { scoreRaw: number; scoreFormat: ScoreFormat };

/** A score is only comparable alongside its format, so both must be present (invariant 6). */
export function hasScore(item: Item): item is ScoredItem {
  return item.scoreRaw !== null && item.scoreFormat !== null;
}

/**
 * A genre is a filter, so it is a button — a `span` with an "filter by" aria-label
 * promises an interaction it cannot deliver to a keyboard (ui-rules.md).
 */
export function GenreChip({
  genre,
  count,
  active,
  onSelect,
}: {
  genre: string;
  count?: number;
  active: boolean;
  onSelect: (genre: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(genre)}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "border-primary/30 bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {genre}
      {count !== undefined && <span className="tabular-nums opacity-60">{count}</span>}
    </button>
  );
}

export function PosterCard({ item, score }: { item: Item; score?: React.ReactNode }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary">
        <MediaCover
          src={item.coverImage}
          title={item.title}
          width={200}
          height={300}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="space-y-1 p-2">
        <p className="truncate text-xs font-bold text-foreground">{item.title}</p>
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            #{item.position + 1}
          </span>
          {score}
        </div>
        <SourceLink
          provider={item.provider as Provider}
          mediaType={item.mediaType as MediaType}
          externalId={item.externalId}
          className="block truncate text-[10px] text-muted-foreground underline-offset-2 hover:text-primary"
        />
      </div>
    </div>
  );
}
