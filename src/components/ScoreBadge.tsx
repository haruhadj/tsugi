import { formatScore, scoreTier, type ScoreFormat, type ScoreTier } from "@/lib/score";
import { cn } from "@/lib/utils";

/*
  Full class strings, not composed from a `bg-score-${tier}` template: Tailwind scans
  source text for complete class names and would emit none of these from an interpolation.
*/
const TIER_CLASSES: Record<ScoreTier, string> = {
  excellent: "text-score-excellent border-score-excellent/30",
  good: "text-score-good border-score-good/30",
  fair: "text-score-fair border-score-fair/30",
  poor: "text-score-poor border-score-poor/30",
};

const SIZES = {
  sm: "text-[11px] px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
  lg: "text-sm px-3.5 py-1.5 gap-1.5",
} as const;

/**
 * A score, in its tier colour. The colour is decoration on top of the text — the value
 * and its scale are always spelled out by formatScore (`87/100`, or POINT_3's "liked
 * it", which has no numeric rendering at all), so the badge never depends on colour to
 * be read (ui-rules.md § Accessibility).
 *
 * The badge sits on an opaque `bg-background` chip rather than a tinted tier background,
 * since it's frequently placed directly over cover art of unpredictable colour/brightness —
 * a translucent tier tint would wash out or vanish against light covers.
 *
 * Numerals are mono and tabular so a column of scores lines up.
 */
export function ScoreBadge({
  scoreRaw,
  scoreFormat,
  size = "md",
  className,
}: {
  scoreRaw: number;
  scoreFormat: ScoreFormat;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const tier = scoreTier(scoreRaw, scoreFormat);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border bg-background/80 font-mono leading-none font-semibold tabular-nums backdrop-blur-sm",
        TIER_CLASSES[tier],
        SIZES[size],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-75" />
      {formatScore(scoreRaw, scoreFormat)}
    </span>
  );
}
