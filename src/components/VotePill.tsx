"use client";

import { cn } from "@/lib/utils";

export type VoteDirection = 1 | -1 | 0;

/*
  Reddit's arrow geometry (taken from its own vote control), because that shape
  reads as "vote" to anyone who has used a link aggregator in the last twenty
  years — a chevron reads as "collapse this section". Two paths per direction
  rather than one path plus a stroke weight: outline for idle, solid for cast,
  which is a shape difference visible without colour (ui-rules.md § Accessibility).
*/
const ARROWS = {
  up: {
    outline:
      "M10 19a3.966 3.966 0 01-3.96-3.962V10.98H2.838a1.731 1.731 0 01-1.605-1.073 1.734 1.734 0 01.377-1.895L9.364.254a.925.925 0 011.272 0l7.754 7.759c.498.499.646 1.242.376 1.894-.27.652-.9 1.073-1.605 1.073h-3.202v4.058A3.965 3.965 0 019.999 19H10ZM2.989 9.179H7.84v5.731c0 1.13.81 2.163 1.934 2.278a2.163 2.163 0 002.386-2.15V9.179h4.851L10 2.163 2.989 9.179Z",
    fill: "M10 19a3.966 3.966 0 01-3.96-3.962V10.98H2.838a1.731 1.731 0 01-1.605-1.073 1.734 1.734 0 01.377-1.895L9.364.254a.925.925 0 011.272 0l7.754 7.759c.498.499.646 1.242.376 1.894-.27.652-.9 1.073-1.605 1.073h-3.202v4.058A3.965 3.965 0 019.999 19H10Z",
  },
  down: {
    outline:
      "M10 1a3.966 3.966 0 013.96 3.962V9.02h3.202c.706 0 1.335.42 1.605 1.073.27.652.122 1.396-.377 1.895l-7.754 7.759a.925.925 0 01-1.272 0l-7.754-7.76a1.734 1.734 0 01-.376-1.894c.27-.652.9-1.073 1.605-1.073h3.202V4.962A3.965 3.965 0 0110 1Zm7.01 9.82h-4.85V5.09c0-1.13-.81-2.163-1.934-2.278a2.163 2.163 0 00-2.386 2.15v5.859H2.989l7.01 7.016 7.012-7.016Z",
    fill: "M10 1a3.966 3.966 0 013.96 3.962V9.02h3.202c.706 0 1.335.42 1.605 1.073.27.652.122 1.396-.377 1.895l-7.754 7.759a.925.925 0 01-1.272 0l-7.754-7.76a1.734 1.734 0 01-.376-1.894c.27-.652.9-1.073 1.605-1.073h3.202V4.962A3.965 3.965 0 0110 1Z",
  },
} as const;

function VoteArrow({
  arrow,
  active,
  className,
}: {
  arrow: keyof typeof ARROWS;
  active: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d={active ? ARROWS[arrow].fill : ARROWS[arrow].outline} />
    </svg>
  );
}

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
 * Direction is colour *and* `aria-pressed` *and* a solid rather than outlined arrow,
 * so the active state
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

  // Hover tints toward the direction's own colour rather than plain foreground —
  // the arrow previews what clicking it will do, the way it does on Reddit.
  const button = cn(
    "rounded-full text-muted-foreground transition-colors",
    "hover:bg-accent",
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
        className={cn(button, "hover:text-upvote", direction === 1 && "text-upvote")}
      >
        <VoteArrow arrow="up" active={direction === 1} className={scale.icon} />
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
        className={cn(button, "hover:text-downvote", direction === -1 && "text-downvote")}
      >
        <VoteArrow arrow="down" active={direction === -1} className={scale.icon} />
      </button>
    </div>
  );
}
