"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MediaCover } from "@/components/MediaCover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ListView } from "@/server/services/lists";

/**
 * The same rundown form as /feed — one surface, hairline-divided rows — because
 * this is the same kind of object seen from the owner's side. What differs is
 * the gutter: on the rundown it carries the slot number, because there the rows
 * are ranked. Here they are not, so the gutter carries the one fact that is
 * true of every row and that only the owner can see — whether it is live.
 *
 * No eyecatch edge and no `bg-card`: those stay reserved for /r/[slug], where
 * there genuinely is one artifact. Twenty of them is what flattened the feed.
 */
export function DashboardRecList({ initialRecs }: { initialRecs: ListView[] }) {
  const [recs, setRecs] = useState(initialRecs);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  // Deleting is immediate and total, so the button asks once before it fires.
  const [confirmingSlug, setConfirmingSlug] = useState<string | null>(null);
  const [errorSlug, setErrorSlug] = useState<{ slug: string; message: string } | null>(
    null,
  );

  async function deleteRec(slug: string) {
    setDeletingSlug(slug);
    setErrorSlug(null);
    const res = await fetch(`/api/lists/${slug}`, { method: "DELETE" });
    if (res.ok) {
      // Deleted slugs are never reissued (criterion 7) — dropping it from
      // local state without a refetch is safe.
      setRecs((current) => current.filter((rec) => rec.slug !== slug));
    } else {
      setErrorSlug({ slug, message: "Could not delete this list. Try again." });
    }
    setDeletingSlug(null);
    setConfirmingSlug(null);
  }

  async function togglePublish(rec: ListView) {
    setTogglingSlug(rec.slug);
    setErrorSlug(null);
    const action = rec.published ? "unpublish" : "publish";
    const res = await fetch(`/api/lists/${rec.slug}/${action}`, { method: "POST" });
    if (res.ok) {
      setRecs((current) =>
        current.map((item) =>
          item.slug === rec.slug ? { ...item, published: !item.published } : item,
        ),
      );
    } else {
      setErrorSlug({
        slug: rec.slug,
        message: rec.published
          ? "Could not unpublish this list. Try again."
          : "Could not publish this list. Try again.",
      });
    }
    setTogglingSlug(null);
  }

  if (recs.length === 0) {
    // An empty screen is an invitation, not a status report.
    return (
      <div className="rounded-xs border border-border px-8 py-12 text-center">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Nothing here yet. Score a few titles and your first list gets a link you can
          send.
        </p>
        <Button asChild size="sm" className="mt-6">
          <Link href="/">Make a list</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xs border border-border">
      {recs.map((rec) => (
        <li key={rec.slug} className="flex items-start gap-5 px-6 py-6">
          <span
            aria-hidden
            className={cn(
              "mt-1 w-12 shrink-0 font-mono text-[0.65rem] tracking-[0.2em] uppercase",
              rec.published ? "text-foreground" : "text-muted-foreground/50",
            )}
          >
            {rec.published ? "Live" : "Draft"}
          </span>

          <div className="min-w-0 flex-1">
            <Link
              href={`/r/${rec.slug}`}
              className="focus-visible:ring-ring block focus-visible:ring-2 focus-visible:outline-none"
            >
              <h2 className="font-display leading-tight font-semibold tracking-[-0.01em] text-foreground">
                {rec.name}
                <span className="sr-only">
                  {rec.published ? " — published" : " — draft"}
                </span>
              </h2>
              <p className="mt-2 font-mono text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
                {rec.items.length} title{rec.items.length === 1 ? "" : "s"} · {rec.views}{" "}
                view{rec.views === 1 ? "" : "s"}
              </p>
            </Link>

            {rec.items.length > 0 ? (
              <div className="mt-4 flex gap-2">
                {rec.items.slice(0, 4).map((item) => (
                  <MediaCover
                    key={item.position}
                    src={item.coverImage}
                    title={item.title}
                    width={44}
                    height={66}
                  />
                ))}
              </div>
            ) : null}

            {errorSlug?.slug === rec.slug ? (
              <p className="mt-3 font-mono text-[0.65rem] leading-tight text-destructive">
                {errorSlug.message}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={togglingSlug !== null}
              onClick={() => togglePublish(rec)}
            >
              {togglingSlug === rec.slug ? (
                <Loader2Icon className="animate-spin" aria-hidden />
              ) : rec.published ? (
                "Unpublish"
              ) : (
                "Publish"
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-muted-foreground",
                confirmingSlug === rec.slug && "text-destructive",
              )}
              disabled={deletingSlug !== null}
              onClick={() =>
                confirmingSlug === rec.slug
                  ? deleteRec(rec.slug)
                  : setConfirmingSlug(rec.slug)
              }
              onBlur={() =>
                setConfirmingSlug((current) => (current === rec.slug ? null : current))
              }
            >
              {deletingSlug === rec.slug ? (
                <Loader2Icon className="animate-spin" aria-hidden />
              ) : confirmingSlug === rec.slug ? (
                "Delete for good"
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
