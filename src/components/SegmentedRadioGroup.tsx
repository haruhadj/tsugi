"use client";

import type { LucideIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * The prototype's segmented control — a strip of joined buttons where exactly
 * one is lit — built on Radix's `RadioGroup` rather than on click handlers. A
 * row by default; see `orientation` for the column the feed's sidebar needs.
 *
 * It looks like a tab strip and is deliberately **not** `Tabs`: every use here
 * picks a *data source* (which provider to search, which media type to fetch),
 * not a view of content already on screen. `ui-rules.md` § Accessibility is
 * explicit about that distinction, and it matters for the same reason the rule
 * exists — a screen-reader user has to know which source is selected before
 * typing, because it changes what the results mean.
 *
 * The radio input itself is visually hidden and the label carries the styling,
 * so arrow-key navigation, roving tabindex, and the group label all survive the
 * restyle. Each option holds a ≥44px target.
 */
export function SegmentedRadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  orientation = "horizontal",
}: {
  label: string;
  value: T;
  // `icon` and `hint` are optional so the original two-word segments stay as
  // they were; the feed's format panel is the case that needs a glyph and a
  // count, and a second near-identical component would be the worse trade.
  options: { value: T; label: string; icon?: LucideIcon; hint?: string }[];
  onChange: (value: T) => void;
  className?: string;
  /**
   * `vertical` stacks the segments into a column, label left and hint right.
   *
   * It exists for one arithmetic reason: three segments carrying an icon, a
   * word and a count do not fit the feed's `18rem` sidebar. Each gets 80px
   * there, and `px-2.5` + a 14px glyph + two `gap-1.5` + the count spend 58px
   * of it, so `truncate` cut "Anime" down to about "An…". Stacking removes the
   * division entirely — a row only has to fit one label — and matches the
   * Categories and Genres panels it sits between, which are already
   * label-left/count-right lists.
   *
   * Passed through to Radix as well as to the layout, so the arrow keys follow
   * what the eye sees: up/down here, left/right in a row.
   */
  orientation?: "horizontal" | "vertical";
}) {
  const isVertical = orientation === "vertical";

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="sr-only">{label}</legend>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as T)}
        orientation={orientation}
        className={cn(
          "flex gap-0.5 rounded-lg border border-border bg-background p-1",
          isVertical ? "flex-col" : "flex-row items-center",
        )}
      >
        {options.map((option) => (
          <div key={option.value} className={cn("flex min-w-0", !isVertical && "flex-1")}>
            <RadioGroupItem
              value={option.value}
              id={`${label}-${option.value}`}
              className="sr-only peer"
            />
            <label
              htmlFor={`${label}-${option.value}`}
              className={cn(
                "flex min-h-11 w-full cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
                isVertical ? "justify-between" : "justify-center",
                "text-muted-foreground hover:text-foreground",
                "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                "peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground",
              )}
            >
              {/* Icon and label travel together so `justify-between` splits the
                  row between the pair and the count, rather than between the
                  glyph and its own word. */}
              <span className="flex min-w-0 items-center gap-1.5">
                {option.icon && <option.icon className="size-3.5 shrink-0" aria-hidden />}
                <span className="truncate">{option.label}</span>
              </span>
              {option.hint && (
                // Left readable rather than aria-hidden: "Anime, 9" is how many
                // lists the option leads to, which is the thing being chosen.
                <span className="font-mono text-[10px] tabular-nums opacity-70">
                  {option.hint}
                </span>
              )}
            </label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
