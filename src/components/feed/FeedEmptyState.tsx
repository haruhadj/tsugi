import { CompassIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { HrefFor } from "@/lib/feed-params";

/** The rundown with nothing (or nothing matching the active filter) to show. */
export function FeedEmptyState({
  hasFilter,
  hrefFor,
}: {
  hasFilter: boolean;
  hrefFor: HrefFor;
}) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
        <CompassIcon className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-lg font-bold">
        {hasFilter ? "Nothing matches that yet" : "The rundown is empty"}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {hasFilter
          ? "Publish a list that fits and it opens this corner of the rundown."
          : "Publish a list and it takes slot 01."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {hasFilter && (
          <Button asChild variant="outline" className="rounded-full">
            <Link
              href={hrefFor({
                category: undefined,
                genre: undefined,
                mediaType: undefined,
                q: undefined,
              })}
            >
              Clear filters
            </Link>
          </Button>
        )}
        <Button asChild className="rounded-full">
          <Link href="/">Make a list</Link>
        </Button>
      </div>
    </div>
  );
}
