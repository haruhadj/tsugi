"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/dashboard-rec-list/FilterBar";
import { RecCard } from "@/components/dashboard-rec-list/RecCard";
import { useDashboardRecs } from "@/components/dashboard-rec-list/useDashboardRecs";
import type { ListView } from "@/server/services/lists";

/**
 * The owner's side of the same objects the rundown shows publicly — a management
 * console rather than a feed. Each row is a card carrying the actions only the owner
 * has: publish/unpublish in place, duplicate, and delete.
 */
export function DashboardRecList({ initialRecs }: { initialRecs: ListView[] }) {
  const {
    isEmpty,
    filter,
    setFilter,
    counts,
    visible,
    busySlug,
    confirmingSlug,
    setConfirmingSlug,
    error,
    deleteRec,
    togglePublish,
    duplicate,
  } = useDashboardRecs(initialRecs);

  if (isEmpty) {
    // An empty screen is an invitation, not a status report.
    return (
      <div className="rounded-2xl border border-dashed border-border px-8 py-16 text-center">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Nothing here yet. Score a few titles and your first list gets a link you can
          send.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/">Make a list</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <FilterBar filter={filter} counts={counts} onChange={setFilter} />

      {visible.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          {filter === "published"
            ? "Nothing published yet. Publish a draft and it joins the rundown."
            : "No drafts — everything you have made is live."}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {visible.map((rec) => (
            <RecCard
              key={rec.slug}
              rec={rec}
              busySlug={busySlug}
              confirmingSlug={confirmingSlug}
              error={error}
              onTogglePublish={togglePublish}
              onDuplicate={duplicate}
              onDeleteOrConfirm={(target) =>
                confirmingSlug === target.slug
                  ? deleteRec(target.slug)
                  : setConfirmingSlug(target.slug)
              }
              onClearConfirm={(slug) =>
                setConfirmingSlug((current) => (current === slug ? null : current))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
