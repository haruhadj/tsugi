"use client";

import {
  LayoutGridIcon,
  ListOrderedIcon,
  MessageSquareIcon,
  TagIcon,
  TrophyIcon,
} from "lucide-react";
import { useState } from "react";
import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SourceLink } from "@/components/SourceLink";
import {
  TIER_BANDS,
  tierBandFor,
  type ScoreFormat,
  type ScoreTier,
} from "@/lib/score";
import type { ListView } from "@/server/services/lists";
import type { MediaType, Provider } from "@/lib/types/media";
import { cn } from "@/lib/utils";

type Item = ListView["items"][number];

const MODES = [
  { id: "ranked", label: "Ranked", icon: ListOrderedIcon },
  { id: "tier", label: "Tiers", icon: TrophyIcon },
  { id: "gallery", label: "Gallery", icon: LayoutGridIcon },
] as const;

type Mode = (typeof MODES)[number]["id"];

// Full class strings — see the note in ScoreBadge on why these are not interpolated.
const TIER_TEXT: Record<ScoreTier, string> = {
  excellent: "text-score-excellent",
  good: "text-score-good",
  fair: "text-score-fair",
  poor: "text-score-poor",
};

const TIER_RAIL: Record<ScoreTier, string> = {
  excellent: "bg-score-excellent/15 border-score-excellent/30",
  good: "bg-score-good/15 border-score-good/30",
  fair: "bg-score-fair/15 border-score-fair/30",
  poor: "bg-score-poor/15 border-score-poor/30",
};

/** A score is only comparable alongside its format, so both must be present (invariant 6). */
function hasScore(item: Item): item is Item & { scoreRaw: number; scoreFormat: string } {
  return item.scoreRaw !== null && item.scoreFormat !== null;
}

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

  /*
    Filtering happens here rather than through the URL: this narrows which of an
    already-loaded list's titles are on screen, which is a reading control like
    the ranked/tier/gallery switch beside it — not part of what the page *is*.
    A shared /r/[slug] link has to open the whole list.
  */
  const visible = activeGenre
    ? items.filter((item) => item.genres.includes(activeGenre))
    : items;

  return (
    <section className="mt-10">
      {genres.length > 0 && (
        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            <TagIcon className="size-3 text-primary" aria-hidden="true" />
            Genre spectrum
          </span>
          <ul className="flex flex-wrap gap-1.5">
            {genres.map((genre) => {
              const active = activeGenre === genre.name;
              return (
                <li key={genre.name}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveGenre(active ? null : genre.name)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active
                        ? "border-highlight/60 bg-highlight/20 text-highlight"
                        : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    #{genre.name}
                    <span className="tabular-nums opacity-70">{genre.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {activeGenre && (
            <p className="text-[11px] text-muted-foreground" role="status">
              Showing {visible.length} of {items.length} titles.{" "}
              <button
                type="button"
                onClick={() => setActiveGenre(null)}
                className="text-primary underline underline-offset-4"
              >
                Show all
              </button>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-mono text-xs tracking-[0.24em] text-muted-foreground uppercase">
          {visible.length} {visible.length === 1 ? "title" : "titles"}
        </h2>

        <div
          role="group"
          aria-label="List layout"
          className="inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-0.5"
        >
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              aria-pressed={mode === option.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                mode === option.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <option.icon className="size-3.5" aria-hidden />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {mode === "ranked" && <RankedView items={visible} />}
        {mode === "tier" && <TierView items={visible} />}
        {mode === "gallery" && <GalleryView items={visible} />}
      </div>
    </section>
  );
}

function RankedView({ items }: { items: Item[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li
          key={item.position}
          className="flex gap-4 rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-input sm:gap-5 sm:p-5"
        >
          <span
            aria-hidden
            className="mt-1 font-mono text-sm leading-none font-bold tabular-nums text-muted-foreground/60"
          >
            {String(index + 1).padStart(2, "0")}
          </span>

          <MediaCover
            src={item.coverImage}
            title={item.title}
            width={72}
            height={108}
            className="shrink-0 rounded-lg"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                    {item.mediaType}
                  </span>
                </div>
                <h3 className="font-display leading-tight font-bold tracking-[-0.01em] text-foreground">
                  {item.title}
                </h3>
              </div>
              {hasScore(item) && (
                <ScoreBadge
                  scoreRaw={item.scoreRaw}
                  scoreFormat={item.scoreFormat as ScoreFormat}
                />
              )}
            </div>

            {item.genres.length > 0 && (
              <ul className="flex flex-wrap gap-1">
                {item.genres.slice(0, 4).map((genre) => (
                  <li
                    key={genre}
                    className="rounded border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    #{genre}
                  </li>
                ))}
              </ul>
            )}

            {/*
              The curator's note gets its own tinted box rather than a bare
              blockquote — on the artifact page this is the part that is actually
              the recommendation, and it should not read as an aside.
            */}
            {item.comment && (
              <div className="rounded-xl border border-primary/20 bg-background/70 p-3">
                <span className="flex items-center gap-1 font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
                  <MessageSquareIcon className="size-3" aria-hidden="true" />
                  Note
                </span>
                <blockquote className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                  {item.comment}
                </blockquote>
              </div>
            )}

            <SourceLink
              provider={item.provider as Provider}
              mediaType={item.mediaType as MediaType}
              externalId={item.externalId}
              className="w-fit font-mono text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TierView({ items }: { items: Item[] }) {
  const scored = items.filter(hasScore);
  const unscored = items.filter((item) => !hasScore(item));

  const bands = TIER_BANDS.map((band) => ({
    ...band,
    items: scored.filter(
      (item) => tierBandFor(item.scoreRaw, item.scoreFormat as ScoreFormat).label === band.label,
    ),
  })).filter((band) => band.items.length > 0);

  if (bands.length === 0 && unscored.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {bands.map((band) => (
        <div
          key={band.label}
          className="flex items-stretch gap-4 overflow-hidden rounded-2xl border border-border bg-card/60"
        >
          <div
            className={cn(
              "flex w-16 shrink-0 items-center justify-center border-r font-mono text-2xl font-bold",
              TIER_RAIL[band.tier],
              TIER_TEXT[band.tier],
            )}
          >
            {band.label}
          </div>
          <ul className="flex flex-wrap gap-3 p-4 pl-0">
            {band.items.map((item) => (
              <li key={item.position} className="w-20">
                <MediaCover
                  src={item.coverImage}
                  title={item.title}
                  width={80}
                  height={120}
                  className="rounded-lg"
                />
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                  {item.title}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {unscored.length > 0 && (
        <div className="flex items-stretch gap-4 overflow-hidden rounded-2xl border border-dashed border-border bg-card/30">
          <div className="flex w-16 shrink-0 items-center justify-center border-r border-border font-mono text-[10px] leading-tight font-bold text-score-unrated">
            NO
            <br />
            SCORE
          </div>
          <ul className="flex flex-wrap gap-3 p-4 pl-0">
            {unscored.map((item) => (
              <li key={item.position} className="w-20">
                <MediaCover
                  src={item.coverImage}
                  title={item.title}
                  width={80}
                  height={120}
                  className="rounded-lg"
                />
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                  {item.title}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GalleryView({ items }: { items: Item[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <li
          key={item.position}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card"
        >
          <MediaCover
            src={item.coverImage}
            title={item.title}
            width={300}
            height={450}
            className="w-full"
          />

          <span
            aria-hidden
            className="absolute top-2 left-2 rounded-full bg-background/80 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums backdrop-blur-sm"
          >
            {String(index + 1).padStart(2, "0")}
          </span>

          {hasScore(item) && (
            <ScoreBadge
              scoreRaw={item.scoreRaw}
              scoreFormat={item.scoreFormat as ScoreFormat}
              size="sm"
              className="absolute top-2 right-2 backdrop-blur-sm"
            />
          )}

          {/*
            The caption sits over a gradient rather than a flat tint so the title
            stays readable on both bright and dark cover art.
          */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent p-3 pt-8">
            <p className="line-clamp-2 text-xs leading-tight font-medium text-foreground">
              {item.title}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
