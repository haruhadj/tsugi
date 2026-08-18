"use client";

import { StarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatScore, scoreOptions, SCORE_FORMAT_BOUNDS, type ScoreFormat } from "@/lib/score";
import { cn } from "@/lib/utils";

const POINT_3_ICON_LABELS: Record<number, string> = {
  1: "😞",
  2: "😐",
  3: "😄",
};

function optionLabel(scoreFormat: ScoreFormat, value: number) {
  if (scoreFormat === "POINT_3") return POINT_3_ICON_LABELS[value];
  if (scoreFormat === "POINT_5") return null;
  return String(value);
}

/**
 * Scores are optional per item (D27), so this has to be *un*-settable — a radio
 * group has no native "none" state, and without a clear control a mis-tap can
 * never be taken back. `null` means unrated, which is not the same as zero (D35).
 */
export function ScoreInput({
  scoreFormat,
  value,
  onChange,
  id,
}: {
  scoreFormat: ScoreFormat;
  value: number | null;
  onChange: (value: number | null) => void;
  id: string;
}) {
  const bounds = SCORE_FORMAT_BOUNDS[scoreFormat];

  if (scoreFormat === "POINT_100" || scoreFormat === "POINT_10_DECIMAL") {
    return (
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="sr-only">
          Score
        </Label>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={bounds.min}
          max={bounds.max}
          step={bounds.decimals > 0 ? 1 / 10 ** bounds.decimals : 1}
          value={value ?? ""}
          onChange={(e) => {
            const next = e.target.valueAsNumber;
            // An emptied field is "unrated", not a rejected keystroke — without
            // this the only way out of a typo is to type over it.
            onChange(Number.isNaN(next) ? null : next);
          }}
          className="h-11 w-24"
          aria-label={`Score out of ${bounds.max}`}
        />
        <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
          {value != null ? formatScore(value, scoreFormat) : `/ ${bounds.max}`}
        </span>
      </div>
    );
  }

  const options = scoreOptions(scoreFormat);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RadioGroup
      value={value != null ? String(value) : undefined}
      onValueChange={(next) => onChange(Number(next))}
      className="flex flex-row flex-wrap gap-2"
      aria-label={`Score out of ${bounds.max}`}
    >
      {options.map((option) => {
        const label = optionLabel(scoreFormat, option);
        const optionId = `${id}-${option}`;
        return (
          <div key={option} className="relative">
            <RadioGroupItem value={String(option)} id={optionId} className="peer sr-only" />
            <Label
              htmlFor={optionId}
              title={formatScore(option, scoreFormat)}
              className={cn(
                "flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-input px-2 text-sm transition-colors",
                "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50"
              )}
            >
              {scoreFormat === "POINT_5" ? (
                <StarIcon
                  className={cn(
                    "size-5",
                    value != null && option <= value ? "fill-primary text-primary" : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
              ) : scoreFormat === "POINT_3" ? (
                <span aria-hidden="true" className="text-lg leading-none">
                  {label}
                </span>
              ) : (
                label
              )}
              <span className="sr-only">{formatScore(option, scoreFormat)}</span>
            </Label>
          </div>
        );
      })}
      </RadioGroup>
      {value != null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="min-h-11 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
