import { Badge } from "@/components/ui/badge";
import { formatScore, type ScoreFormat } from "@/lib/score";

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
    <Badge variant="secondary" className={className}>
      {formatScore(scoreRaw, scoreFormat)}
    </Badge>
  );
}
