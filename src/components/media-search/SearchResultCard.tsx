import { CheckIcon, PlusIcon, StarIcon } from "lucide-react";
import { CommandItem } from "@/components/ui/command";
import { MediaCover } from "@/components/MediaCover";
import { MediaTypeChip } from "@/components/MediaTypeChip";
import { PROVIDER_LABELS } from "@/components/media-search/labels";
import { cn } from "@/lib/utils";
import type { UnifiedMediaResult } from "@/lib/types/media";

export function SearchResultCard({
  result,
  added,
  onSelect,
}: {
  result: UnifiedMediaResult;
  added: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${result.provider}-${result.externalId}`}
      onSelect={onSelect}
      className="flex-col items-stretch gap-0 overflow-hidden rounded-xl border border-border bg-card p-0"
    >
      <div className="relative aspect-[2/3] w-full">
        <MediaCover
          src={result.coverImage}
          title=""
          width={200}
          height={300}
          className="size-full object-cover"
        />
        {result.averageScore !== null && (
          <span className="absolute bottom-1 right-1 z-10 inline-flex items-center gap-1 rounded border border-highlight/30 bg-highlight/15 px-1.5 py-0.5 font-mono text-[10px] text-highlight">
            <StarIcon className="size-2.5" aria-hidden="true" />
            {/*
              Named for screen readers because this chip sits beside the
              author's own ScoreBadge elsewhere in the builder and looks
              like one — it is the provider's community aggregate, never
              the user's rating (D28).
            */}
            <span className="sr-only">
              {PROVIDER_LABELS[result.provider]} community score{" "}
            </span>
            {result.averageScore}%
          </span>
        )}
        <span
          className={cn(
            "absolute top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full",
            added ? "bg-success/90 text-success-foreground" : "bg-primary/90 text-primary-foreground",
          )}
          aria-label={added ? "Added — press to remove" : "Add to list"}
        >
          {added ? (
            <CheckIcon className="size-4" aria-hidden="true" />
          ) : (
            <PlusIcon className="size-4" aria-hidden="true" />
          )}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <MediaTypeChip mediaType={result.mediaType} />
          {result.year !== null && (
            <span className="font-mono text-[11px] text-muted-foreground">{result.year}</span>
          )}
        </div>
        <span className="line-clamp-2 text-xs font-bold text-foreground">{result.title}</span>
        {result.genres.length > 0 && (
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {result.genres.slice(0, 2).join(" · ")}
          </span>
        )}
      </div>
    </CommandItem>
  );
}
