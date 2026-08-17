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

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={isVoting}
        onClick={() => vote(1)}
        aria-label="Upvote"
        className={cn(
          "rounded-md p-1 text-muted-foreground transition-colors hover:text-bloom disabled:opacity-50",
          myDirection === 1 && "text-bloom",
        )}
      >
        <ChevronUpIcon className="size-5" aria-hidden />
      </button>
      <span
        className={cn(
          "font-mono text-sm tabular-nums transition-transform duration-200",
          bump && "scale-125",
        )}
      >
        {score}
      </span>
      <button
        type="button"
        disabled={isVoting}
        onClick={() => vote(-1)}
        aria-label="Downvote"
        className={cn(
          "rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50",
          myDirection === -1 && "text-destructive",
        )}
      >
        <ChevronDownIcon className="size-5" aria-hidden />
      </button>
      {error ? (
        <span className="max-w-20 text-center font-mono text-[10px] text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
