"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = { slug: string; initialScore: number };

// Direction is optimistic-only (no per-entry "your vote" field on FeedEntry,
// so there is nothing authoritative to reconcile against on mount — this
// button only knows what *this* browser has clicked this page load).
export function VoteButtons({ slug, initialScore }: Props) {
  const [score, setScore] = useState(initialScore);
  const [myDirection, setMyDirection] = useState<1 | -1 | 0>(0);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(false);

  async function vote(direction: 1 | -1) {
    if (isVoting) return;
    setIsVoting(true);
    setError(null);

    const res = await fetch(`/api/feed/${slug}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });

    if (res.status === 401) {
      setError("Sign in to vote.");
    } else if (res.status === 429) {
      const { retryAfter } = await res.json();
      setError(`Too many votes. Wait ${retryAfter}s.`);
    } else if (!res.ok) {
      setError("Couldn't vote. Try again.");
    } else {
      const { direction: newDirection } = (await res.json()) as { direction: 1 | -1 | 0 };
      setScore((current) => current - myDirection + newDirection);
      setMyDirection(newDirection);
      setBump(true);
      setTimeout(() => setBump(false), 200);
    }

    setIsVoting(false);
  }

  // Horizontal and hairline-divided, so it reads as a level meter on the rundown
  // row rather than a vertical Reddit stack. `bloom` is deliberately absent:
  // it is never a button colour, and on the feed it is already spent on slot 01.
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-stretch divide-x divide-border rounded-xs border border-border">
        <button
          type="button"
          disabled={isVoting}
          onClick={() => vote(1)}
          aria-label="Upvote"
          aria-pressed={myDirection === 1}
          className={cn(
            "px-2 py-1.5 text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-foreground disabled:opacity-50",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            myDirection === 1 && "text-primary",
          )}
        >
          <ChevronUpIcon className="size-4" aria-hidden />
        </button>
        <span
          aria-live="polite"
          className={cn(
            "flex min-w-11 items-center justify-center px-2 font-mono text-sm font-medium tabular-nums transition-transform duration-200",
            bump && "scale-110",
          )}
        >
          {score}
        </span>
        <button
          type="button"
          disabled={isVoting}
          onClick={() => vote(-1)}
          aria-label="Downvote"
          aria-pressed={myDirection === -1}
          className={cn(
            "px-2 py-1.5 text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-foreground disabled:opacity-50",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            myDirection === -1 && "text-destructive",
          )}
        >
          <ChevronDownIcon className="size-4" aria-hidden />
        </button>
      </div>
      {error ? (
        <span className="text-right font-mono text-[10px] leading-tight text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
