"use client";

import { useState } from "react";
import { VotePill, type VoteDirection } from "@/components/VotePill";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  initialScore: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
};

// Direction is optimistic-only (no per-entry "your vote" field on FeedEntry,
// so there is nothing authoritative to reconcile against on mount — this
// button only knows what *this* browser has clicked this page load).
export function VoteButtons({ slug, initialScore, orientation, className }: Props) {
  const [score, setScore] = useState(initialScore);
  const [myDirection, setMyDirection] = useState<VoteDirection>(0);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { direction: newDirection } = (await res.json()) as { direction: VoteDirection };
      setScore((current) => current - myDirection + newDirection);
      setMyDirection(newDirection);
    }

    setIsVoting(false);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        orientation === "vertical" ? "items-center" : "items-end",
        className,
      )}
    >
      <VotePill
        score={score}
        direction={myDirection}
        onVote={vote}
        disabled={isVoting}
        orientation={orientation}
      />
      {error ? (
        <span className="max-w-28 text-center font-mono text-[10px] leading-tight text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
