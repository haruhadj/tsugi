"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * The prototype's segmented control — a row of joined buttons where exactly one
 * is lit — built on Radix's `RadioGroup` rather than on click handlers.
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
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="sr-only">{label}</legend>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as T)}
        className="flex flex-row items-center gap-0.5 rounded-lg border border-border bg-background p-1"
      >
        {options.map((option) => (
          <div key={option.value} className="flex">
            <RadioGroupItem
              value={option.value}
              id={`${label}-${option.value}`}
              className="sr-only peer"
            />
            <label
              htmlFor={`${label}-${option.value}`}
              className={cn(
                "flex min-h-11 cursor-pointer items-center rounded-md px-2.5 text-xs font-semibold transition-colors",
                "text-muted-foreground hover:text-foreground",
                "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                "peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground",
              )}
            >
              {option.label}
            </label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
