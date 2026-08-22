"use client";

import { useRef, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  // Guards reconciliation, not clicks — clicks are never blocked, so voting stays
  // clickable through a slow request instead of going dead-looking. Each vote()
  // call claims the next id; a response only touches state if its id is still the
  // latest, so a slow, superseded response can't clobber a state a newer click
  // already moved past.
  const requestId = useRef(0);

  async function vote(direction: 1 | -1) {
    setError(null);
    const thisRequestId = ++requestId.current;

    // Applied before the request lands, so the click feels instant. Clicking the
    // same direction again is a toggle-off (0) — the same rule the server applies —
    // so the optimistic guess matches what a successful response will say.
    const previousScore = score;
    const previousDirection = myDirection;
    const optimisticDirection: VoteDirection = previousDirection === direction ? 0 : direction;
    setScore((current) => current - previousDirection + optimisticDirection);
    setMyDirection(optimisticDirection);

    function rollback() {
      if (requestId.current !== thisRequestId) return;
      setScore(previousScore);
      setMyDirection(previousDirection);
    }

    try {
      const res = await fetch(`/api/feed/${slug}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });

      if (res.status === 401) {
        rollback();
        setError("Sign in to vote.");
      } else if (res.status === 429) {
        rollback();
        const { retryAfter } = await res.json();
        setError(`Too many votes. Wait ${retryAfter}s.`);
      } else if (!res.ok) {
        rollback();
        setError("Couldn't vote. Try again.");
      } else {
        const { direction: newDirection } = (await res.json()) as { direction: VoteDirection };
        // Reconcile against the optimistic guess, not the pre-click state — the
        // optimistic update has already been applied. Skipped entirely if a later
        // click has since superseded this request.
        if (requestId.current === thisRequestId && newDirection !== optimisticDirection) {
          setScore((current) => current - optimisticDirection + newDirection);
          setMyDirection(newDirection);
        }
      }
    } catch {
      rollback();
      setError("Couldn't vote. Try again.");
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        orientation === "vertical" ? "items-center" : "items-end",
        className,
      )}
    >
      <VotePill score={score} direction={myDirection} onVote={vote} orientation={orientation} />
      {error ? (
        <span className="max-w-28 text-center font-mono text-[10px] leading-tight text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
