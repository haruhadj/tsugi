"use client";

import { CopyPlusIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MediaCover } from "@/components/MediaCover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ListView } from "@/server/services/lists";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "drafts", label: "Drafts" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

/**
 * The owner's side of the same objects the rundown shows publicly — a management
 * console rather than a feed. Each row is a card carrying the actions only the owner
 * has: publish/unpublish in place, duplicate, and delete.
 */
export function DashboardRecList({ initialRecs }: { initialRecs: ListView[] }) {
  const router = useRouter();
  const [recs, setRecs] = useState(initialRecs);
  const [filter, setFilter] = useState<Filter>("all");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  // Deleting is immediate and total, so the button asks once before it fires.
  const [confirmingSlug, setConfirmingSlug] = useState<string | null>(null);
  const [error, setError] = useState<{ slug: string; message: string } | null>(null);

  const counts = {
    all: recs.length,
    published: recs.filter((rec) => rec.published).length,
    drafts: recs.filter((rec) => !rec.published).length,
  };

  const visible = recs.filter((rec) =>
    filter === "all" ? true : filter === "published" ? rec.published : !rec.published,
  );

  async function deleteRec(slug: string) {
    setBusySlug(slug);
    setError(null);
    const res = await fetch(`/api/lists/${slug}`, { method: "DELETE" });
    if (res.ok) {
      // Deleted slugs are never reissued (criterion 7) — dropping it from
      // local state without a refetch is safe.
      setRecs((current) => current.filter((rec) => rec.slug !== slug));
    } else {
      setError({ slug, message: "Could not delete this list. Try again." });
    }
    setBusySlug(null);
    setConfirmingSlug(null);
  }

  async function togglePublish(rec: ListView) {
    setBusySlug(rec.slug);
    setError(null);
    const action = rec.published ? "unpublish" : "publish";
    const res = await fetch(`/api/lists/${rec.slug}/${action}`, { method: "POST" });
    if (res.ok) {
      setRecs((current) =>
        current.map((item) =>
          item.slug === rec.slug ? { ...item, published: !item.published } : item,
        ),
      );
    } else {
      setError({
        slug: rec.slug,
        message: rec.published
          ? "Could not unpublish this list. Try again."
          : "Could not publish this list. Try again.",
      });
    }
    setBusySlug(null);
  }

  async function duplicate(rec: ListView) {
    setBusySlug(rec.slug);
    setError(null);
    const res = await fetch(`/api/lists/${rec.slug}/duplicate`, { method: "POST" });
    if (res.ok) {
      // The copy is a whole new row with a server-assigned slug, so this refetches
      // rather than guessing what the server wrote.
      router.refresh();
    } else if (res.status === 429) {
      const { retryAfter } = await res.json();
      setError({ slug: rec.slug, message: `Too many lists. Wait ${retryAfter}s.` });
    } else {
      setError({ slug: rec.slug, message: "Could not duplicate this list. Try again." });
    }
    setBusySlug(null);
  }

  if (recs.length === 0) {
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
      <div
        role="group"
        aria-label="Filter lists"
        className="inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-0.5"
      >
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            aria-pressed={filter === option.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              filter === option.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            <span className="font-mono tabular-nums opacity-70">{counts[option.id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          {filter === "published"
            ? "Nothing published yet. Publish a draft and it joins the rundown."
            : "No drafts — everything you have made is live."}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {visible.map((rec) => (
            <li
              key={rec.slug}
              className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-4">
                  <MediaCover
                    src={rec.items[0]?.coverImage ?? null}
                    title={rec.name}
                    width={48}
                    height={72}
                    className="shrink-0 rounded-lg"
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold",
                          rec.published
                            ? "border-success/30 bg-success/15 text-success"
                            : "border-border bg-secondary text-muted-foreground",
                        )}
                      >
                        {rec.published ? "Live" : "Draft"}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        /r/{rec.slug}
                      </span>
                    </div>

                    <Link
                      href={`/r/${rec.slug}`}
                      className="mt-1.5 block rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <h2 className="font-display leading-tight font-bold tracking-[-0.01em] text-foreground">
                        {rec.caption ?? rec.name}
                      </h2>
                    </Link>

                    <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                      {rec.name} · {rec.items.length} title
                      {rec.items.length === 1 ? "" : "s"} · {rec.views} view
                      {rec.views === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={busySlug !== null}
                    onClick={() => togglePublish(rec)}
                  >
                    {busySlug === rec.slug ? (
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
                    className="rounded-full text-muted-foreground"
                    disabled={busySlug !== null}
                    aria-label={`Duplicate ${rec.name}`}
                    onClick={() => duplicate(rec)}
                  >
                    <CopyPlusIcon aria-hidden />
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground"
                  >
                    <Link href={`/r/${rec.slug}`} aria-label={`Open ${rec.name}`}>
                      <ExternalLinkIcon aria-hidden />
                    </Link>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full text-muted-foreground",
                      confirmingSlug === rec.slug && "text-destructive",
                    )}
                    disabled={busySlug !== null}
                    onClick={() =>
                      confirmingSlug === rec.slug
                        ? deleteRec(rec.slug)
                        : setConfirmingSlug(rec.slug)
                    }
                    onBlur={() =>
                      setConfirmingSlug((current) =>
                        current === rec.slug ? null : current,
                      )
                    }
                  >
                    {confirmingSlug === rec.slug ? "Delete for good" : "Delete"}
                  </Button>
                </div>
              </div>

              {rec.items.length > 1 && (
                <ul aria-hidden className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {rec.items.slice(0, 8).map((item) => (
                    <li key={item.position} className="shrink-0">
                      <MediaCover
                        src={item.coverImage}
                        title=""
                        width={40}
                        height={60}
                        className="rounded-md"
                      />
                    </li>
                  ))}
                </ul>
              )}

              {error?.slug === rec.slug && (
                <p className="mt-3 font-mono text-[11px] text-destructive">
                  {error.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
