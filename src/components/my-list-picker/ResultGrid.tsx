import { CheckIcon, PlusIcon } from "lucide-react";
import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { ListEntry } from "@/lib/types/media";

/**
 * Two-up on a phone, not three: this grid is nested two levels inside padded
 * panels, so at 360px `grid-cols-3` left each cell about 88px to carry cover
 * art, a title, a score badge and a tap target — the title truncated to a
 * couple of characters and the badge overlapped the art it annotates. Two-up
 * gives roughly 140px, the width the cell was designed against. It rejoins
 * the desktop ramp at `sm`.
 */
export function ResultGrid({
  entries,
  isSelected,
  onImport,
}: {
  entries: ListEntry[];
  isSelected: (entry: ListEntry) => boolean;
  onImport: (entry: ListEntry) => void;
}) {
  if (entries.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No titles match.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {entries.map((entry) => {
        const selected = isSelected(entry);
        return (
          <li
            key={`${entry.provider}-${entry.externalId}`}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="relative aspect-[2/3]">
              <MediaCover
                src={entry.coverImage}
                title={entry.title}
                width={200}
                height={300}
                className="size-full object-cover"
              />
              {entry.scoreRaw != null && entry.scoreFormat && (
                <div className="absolute bottom-1 right-1 z-10">
                  <ScoreBadge scoreRaw={entry.scoreRaw} scoreFormat={entry.scoreFormat} size="sm" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 p-2">
              <span className="line-clamp-2 text-xs font-medium leading-tight">{entry.title}</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {entry.year && <span>{entry.year}</span>}
                {entry.genres.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{entry.genres.slice(0, 2).join(", ")}</span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={selected}
              onClick={() => onImport(entry)}
              className={`absolute top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full transition-colors ${
                selected
                  ? "bg-success/90 text-success-foreground"
                  : "bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100"
              }`}
              aria-label={selected ? "Added" : "Add to list"}
            >
              {selected ? (
                <CheckIcon className="size-4" aria-hidden="true" />
              ) : (
                <PlusIcon className="size-4" aria-hidden="true" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
