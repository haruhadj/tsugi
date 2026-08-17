import { formatScore, type ScoreFormat } from "@/lib/score";
import { cn } from "@/lib/utils";

/**
 * Scores are always mono (ui-tokens.md) — a score is data, and data never gets
 * set in the display face. This deliberately is not a shadcn `Badge`: a pill
 * with its own surface reads as a label, and a score is a measurement.
 */
export function ScoreBadge({
  scoreRaw,
  scoreFormat,
  className,
}: {
  scoreRaw: number;
  scoreFormat: ScoreFormat;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 font-mono text-sm leading-none font-medium tabular-nums text-foreground",
        className,
      )}
    >
      {formatScore(scoreRaw, scoreFormat)}
    </span>
  );
}
