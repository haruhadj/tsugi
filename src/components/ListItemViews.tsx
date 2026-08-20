"use client";

import {
  LayoutGridIcon,
  ListOrderedIcon,
  TagIcon,
  TrophyIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
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

/** An item whose score is safe to render: both halves of the pair are present (invariant 6). */
type ScoredItem = Item & { scoreRaw: number; scoreFormat: ScoreFormat };

const MODES = [
  { id: "ranked", label: "Ranked", icon: ListOrderedIcon },
  { id: "tier", label: "Tiers", icon: TrophyIcon },
  { id: "gallery", label: "Gallery", icon: LayoutGridIcon },
] as const;

type Mode = (typeof MODES)[number]["id"];

/*
  Full class strings — see the note in ScoreBadge on why these are not interpolated.
  Score colour is defined once, by the `score-*` tokens: a raw `text-amber-400` here
  would both break retheming and invert the ramp's meaning, since `score-excellent`
  is the emerald end and `score-poor` the rose one.
*/
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

/** Unscored items are not a band — `score-unrated` is their own token. */
const UNRATED_TEXT = "text-score-unrated";
const UNRATED_RAIL = "bg-score-unrated/15 border-score-unrated/30";

/** A score is only comparable alongside its format, so both must be present (invariant 6). */
function hasScore(item: Item): item is ScoredItem {
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

  const visible = activeGenre
    ? items.filter((item) => item.genres.includes(activeGenre))
    : items;

  /** Toggle semantics: picking the active genre clears it, so the chip is its own off switch. */
  const selectGenre = (genre: string) =>
    setActiveGenre((current) => (current === genre ? null : genre));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-mono text-xs tracking-[0.24em] text-muted-foreground uppercase">
          {visible.length} {visible.length === 1 ? "title" : "titles"}
          {activeGenre && <> of {items.length}</>}
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

/**
 * A genre is a filter, so it is a button — a `span` with an "filter by" aria-label
 * promises an interaction it cannot deliver to a keyboard (ui-rules.md).
 */
function GenreChip({
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

/**
 * Five lettered bands over four colour tiers: S and A are both `excellent` and are
 * told apart by the letter, which is why this buckets on `tierBandFor().label` rather
 * than on the tier. Unscored items get their own group — "D" is a real band for a low
 * score, so filing unrated titles under it would claim they were rated badly.
 */
function TierView({ items }: { items: Item[] }) {
  const { banded, unscored } = useMemo(() => {
    // Seeded from TIER_BANDS so the group list cannot drift from the banding function.
    const buckets = new Map<string, { tier: ScoreTier; items: ScoredItem[] }>(
      TIER_BANDS.map((band) => [band.label, { tier: band.tier, items: [] }]),
    );
    const unrated: Item[] = [];

    for (const item of items) {
      if (!hasScore(item)) {
        unrated.push(item);
        continue;
      }
      const bucket = buckets.get(tierBandFor(item.scoreRaw, item.scoreFormat).label);
      if (bucket) bucket.items.push(item);
    }

    return {
      // Map preserves insertion order, and TIER_BANDS is best-first.
      banded: [...buckets].map(([label, bucket]) => ({ label, ...bucket })),
      unscored: unrated,
    };
  }, [items]);

  if (banded.every((group) => group.items.length === 0) && unscored.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {banded.map(
        (group) =>
          group.items.length > 0 && (
            <TierRow
              key={group.label}
              label={group.label}
              count={group.items.length}
              textClass={TIER_TEXT[group.tier]}
              railClass={TIER_RAIL[group.tier]}
            >
              {group.items.map((item) => (
                <PosterCard
                  key={item.position}
                  item={item}
                  score={
                    <ScoreBadge
                      scoreRaw={item.scoreRaw}
                      scoreFormat={item.scoreFormat}
                      size="sm"
                    />
                  }
                />
              ))}
            </TierRow>
          ),
      )}

      {unscored.length > 0 && (
        <TierRow
          label="—"
          srLabel="Unscored"
          count={unscored.length}
          textClass={UNRATED_TEXT}
          railClass={UNRATED_RAIL}
        >
          {unscored.map((item) => (
            <PosterCard key={item.position} item={item} />
          ))}
        </TierRow>
      )}
    </div>
  );
}

function TierRow({
  label,
  srLabel,
  count,
  textClass,
  railClass,
  children,
}: {
  label: string;
  /** Spoken name when the glyph is not a letter, so "—" is not read as punctuation. */
  srLabel?: string;
  count: number;
  textClass: string;
  railClass: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={`${srLabel ?? `Tier ${label}`} — ${count} ${count === 1 ? "title" : "titles"}`}
      className={cn(
        "flex flex-col items-start gap-4 rounded-2xl border p-4 sm:p-5 md:flex-row",
        railClass,
      )}
    >
      <div className="flex w-full shrink-0 items-center justify-between rounded-xl border border-border bg-card/80 p-3 text-center md:w-36 md:flex-col md:justify-center">
        <span aria-hidden className={cn("font-mono text-2xl font-bold sm:text-3xl", textClass)}>
          {label}
        </span>
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          {srLabel ?? `${count} ${count === 1 ? "title" : "titles"}`}
        </span>
      </div>

      <div className="grid w-full flex-1 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {children}
      </div>
    </section>
  );
}

function PosterCard({ item, score }: { item: Item; score?: React.ReactNode }) {
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
            #{item.position}
          </span>
          {score}
        </div>
      </div>
    </div>
  );
}

function GalleryView({
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
              #{item.position}
            </div>

            {hasScore(item) && (
              <div className="absolute top-2 right-2">
                <ScoreBadge scoreRaw={item.scoreRaw} scoreFormat={item.scoreFormat} size="sm" />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/85 to-transparent" />
          </div>

          <div className="space-y-1 bg-card p-3">
            <h4 className="line-clamp-1 text-xs font-bold text-foreground">{item.title}</h4>
            <p className="font-mono text-[10px] text-muted-foreground uppercase">
              {item.mediaType}
            </p>
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
          </div>
        </li>
      ))}
    </ul>
  );
}

function RankedView({
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
              {item.position}
            </span>

            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                    <span className="font-mono uppercase">{item.mediaType}</span>
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
                  <p className="max-w-xs text-right text-sm text-muted-foreground/80 italic">
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
