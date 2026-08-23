"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type VoteDirection = 1 | -1 | 0;

const SIZES = {
  sm: { pad: "p-1", icon: "size-3.5", score: "text-xs", span: "min-w-6" },
  md: { pad: "p-1.5", icon: "size-4", score: "text-sm", span: "min-w-8" },
  // The rundown's card action bar. `md` renders a ~32px target, and the arrows
  // are the two most-tapped controls in the product — under the 44px floor
  // (ui-rules.md § Responsive) they sit close enough together to mis-hit, and
  // an accidental downvote is a write. This is `md` with room around the icons
  // on a phone, collapsing back to exactly `md` from the `md` breakpoint up,
  // where the pointer is precise and the extra bulk would just be loud.
  touch: {
    pad: "p-2.5 md:p-1.5",
    icon: "size-5 md:size-4",
    score: "text-sm",
    span: "min-w-9 md:min-w-8",
  },
} as const;

/**
 * The vote control, shared by feed rows, the list page, and comments. Presentational
 * and fully controlled — it owns no score and performs no request, because the three
 * callers post to three different endpoints and reconcile differently.
 *
 * Direction is colour *and* `aria-pressed` *and* a filled icon, so the active state
 * survives colour-blindness and high-contrast modes (ui-rules.md § Accessibility).
 * Rose-up / indigo-down is directional, not a judgement — see the token comments.
 */
export function VotePill({
  score,
  direction,
  onVote,
  disabled = false,
  orientation = "horizontal",
  size = "md",
  className,
}: {
  score: number;
  direction: VoteDirection;
  onVote: (direction: 1 | -1) => void;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const scale = SIZES[size];
  const isVertical = orientation === "vertical";

  const button = cn(
    "rounded-full text-muted-foreground transition-colors",
    "hover:bg-accent hover:text-foreground",
    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
    scale.pad,
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/40",
        isVertical ? "flex-col px-0.5 py-1" : "px-1 py-0.5",
        className,
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote(1)}
        aria-label="Upvote"
        aria-pressed={direction === 1}
        className={cn(button, direction === 1 && "text-upvote hover:text-upvote")}
      >
        <ChevronUpIcon
          className={scale.icon}
          strokeWidth={direction === 1 ? 3 : 2}
          aria-hidden
        />
      </button>

      <span
        aria-live="polite"
        className={cn(
          "text-center font-mono font-semibold tabular-nums",
          scale.score,
          scale.span,
          direction === 1 && "text-upvote",
          direction === -1 && "text-downvote",
        )}
      >
        {score}
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote(-1)}
        aria-label="Downvote"
        aria-pressed={direction === -1}
        className={cn(button, direction === -1 && "text-downvote hover:text-downvote")}
      >
        <ChevronDownIcon
          className={scale.icon}
          strokeWidth={direction === -1 ? 3 : 2}
          aria-hidden
        />
      </button>
    </div>
  );
}
