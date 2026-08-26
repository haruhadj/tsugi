import { useMemo } from "react";
import { ScoreBadge } from "@/components/ScoreBadge";
import { hasScore, PosterCard, type Item, type ScoredItem } from "@/components/list-item-views/shared";
import { TIER_BANDS, tierBandFor, type ScoreTier } from "@/lib/score";
import { cn } from "@/lib/utils";

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

/**
 * Five lettered bands over four colour tiers: S and A are both `excellent` and are
 * told apart by the letter, which is why this buckets on `tierBandFor().label` rather
 * than on the tier. Unscored items get their own group — "D" is a real band for a low
 * score, so filing unrated titles under it would claim they were rated badly.
 */
export function TierView({ items }: { items: Item[] }) {
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
