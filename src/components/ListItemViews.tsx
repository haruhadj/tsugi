"use client";

import { LayoutGridIcon, ListOrderedIcon, TagIcon, TrophyIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { GalleryView } from "@/components/list-item-views/GalleryView";
import { RankedView } from "@/components/list-item-views/RankedView";
import { GenreChip, type Item } from "@/components/list-item-views/shared";
import { TierView } from "@/components/list-item-views/TierView";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "ranked", label: "Ranked", icon: ListOrderedIcon },
  { id: "tier", label: "Tiers", icon: TrophyIcon },
  { id: "gallery", label: "Gallery", icon: LayoutGridIcon },
] as const;

type Mode = (typeof MODES)[number]["id"];

export function ListItemViews({
  items,
  genres = [],
}: {
  items: Item[];
  /** The list's genre cloud, aggregated server-side. Empty for pre-D48 lists. */
  genres?: { name: string; count: number }[];
}) {
  const [mode, setMode] = useState<Mode>("ranked");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  /** The one media type shared by every item, or `null` if the list mixes them. */
  const listMediaType = useMemo(() => {
    const first = items[0]?.mediaType;
    if (!first) return null;
    return items.every((item) => item.mediaType === first) ? first : null;
  }, [items]);

  const visible = activeGenre
    ? items.filter((item) => item.genres.includes(activeGenre))
    : items;

  /** Toggle semantics: picking the active genre clears it, so the chip is its own off switch. */
  const selectGenre = (genre: string) =>
    setActiveGenre((current) => (current === genre ? null : genre));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 className="font-mono text-xs tracking-[0.24em] text-muted-foreground uppercase">
          {/*
            The media type lives here, not on each card: a list is built from a
            single search scope, so every item repeats the same word. It only
            earns a slot when it actually distinguishes something — a mixed list
            (possible for hand-assembled ones) falls back to the bare count.
          */}
          {listMediaType && <span className="text-primary">{listMediaType}</span>}
          {listMediaType && " · "}
          {visible.length} {visible.length === 1 ? "title" : "titles"}
          {activeGenre && <> of {items.length}</>}
        </h2>

        <div
          role="group"
          aria-label="List layout"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-0.5"
        >
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              aria-pressed={mode === option.id}
              title={option.label}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                mode === option.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <option.icon className="size-3.5" aria-hidden />
              {/* Icon-only below `md`. Three labelled pills plus the title count
                  need ~374px on a row that has ~280px at 360px wide, and this is
                  the toolbar for the artifact page — the one screen that must not
                  look broken. The name survives for screen readers and as a
                  tooltip. */}
              <span className="hidden md:inline">{option.label}</span>
              <span className="sr-only md:hidden">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {genres.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
          {/*
            Frequency-ranked, exactly as the server aggregated it — re-sorting
            alphabetically here would throw away the ranking that makes it a spectrum.
          */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
              Genre spectrum
            </span>
            {genres.map((genre) => (
              <GenreChip
                key={genre.name}
                genre={genre.name}
                count={genre.count}
                active={activeGenre === genre.name}
                onSelect={selectGenre}
              />
            ))}
          </div>

          {activeGenre && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-highlight/30 bg-highlight/10 p-3 text-xs text-highlight">
              <span className="inline-flex items-center gap-2">
                <TagIcon className="size-3.5" aria-hidden />
                <span>
                  Filtering by <strong className="font-bold">{activeGenre}</strong> —{" "}
                  {visible.length} of {items.length} titles
                </span>
              </span>
              <button
                type="button"
                onClick={() => setActiveGenre(null)}
                className="inline-flex items-center gap-1 rounded-full bg-highlight/20 px-2 py-0.5 text-[11px] font-bold transition-colors hover:bg-highlight/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <XIcon className="size-3" aria-hidden />
                Show all titles
              </button>
            </div>
          )}
        </div>
      )}

      <div>
        {mode === "ranked" && (
          <RankedView items={visible} activeGenre={activeGenre} onGenreSelect={selectGenre} />
        )}
        {mode === "tier" && <TierView items={visible} />}
        {mode === "gallery" && (
          <GalleryView items={visible} activeGenre={activeGenre} onGenreSelect={selectGenre} />
        )}
      </div>
    </div>
  );
}
