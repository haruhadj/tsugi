"use client";

import { Loader2Icon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MediaCover } from "@/components/MediaCover";
import { Button } from "@/components/ui/button";
import type { ListView } from "@/server/services/lists";

export function DashboardRecList({ initialRecs }: { initialRecs: ListView[] }) {
  const [recs, setRecs] = useState(initialRecs);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  async function deleteRec(slug: string) {
    setDeletingSlug(slug);
    const res = await fetch(`/api/lists/${slug}`, { method: "DELETE" });
    if (res.ok) {
      // Deleted slugs are never reissued (criterion 7) — dropping it from
      // local state without a refetch is safe.
      setRecs((current) => current.filter((rec) => rec.slug !== slug));
    }
    setDeletingSlug(null);
  }

  async function togglePublish(rec: ListView) {
    setTogglingSlug(rec.slug);
    const action = rec.published ? "unpublish" : "publish";
    const res = await fetch(`/api/lists/${rec.slug}/${action}`, { method: "POST" });
    if (res.ok) {
      setRecs((current) =>
        current.map((item) =>
          item.slug === rec.slug ? { ...item, published: !item.published } : item,
        ),
      );
    }
    setTogglingSlug(null);
  }

  if (recs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You have not made any lists yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-6">
      {recs.map((rec) => (
        <li
          key={rec.slug}
          className="relative overflow-hidden rounded-md border border-border bg-card"
        >
          <div className="eyecatch-edge absolute inset-y-0 left-0 w-1" />
          <div className="flex items-start justify-between gap-4 p-6 pl-8">
            <Link href={`/r/${rec.slug}`} className="flex-1">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
                    {rec.name}
                  </h2>
                  {!rec.published && (
                    <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                      Draft
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
                  {rec.items.length} title{rec.items.length === 1 ? "" : "s"} · {rec.views} view
                  {rec.views === 1 ? "" : "s"}
                </p>
                <div className="flex gap-2">
                  {rec.items.slice(0, 4).map((item) => (
                    <MediaCover
                      key={item.position}
                      src={item.coverImage}
                      title={item.title}
                      width={48}
                      height={72}
                    />
                  ))}
                </div>
              </div>
            </Link>

            <div className="flex flex-col items-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={deletingSlug !== null}
                onClick={() => deleteRec(rec.slug)}
              >
                {deletingSlug === rec.slug ? (
                  <Loader2Icon className="animate-spin" aria-hidden />
                ) : (
                  <TrashIcon aria-hidden />
                )}
              </Button>
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
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
