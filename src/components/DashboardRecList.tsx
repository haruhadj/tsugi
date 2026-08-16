"use client";

import { Loader2Icon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MediaCover } from "@/components/MediaCover";
import { Button } from "@/components/ui/button";
import type { RecommendationView } from "@/server/services/recommendations";

export function DashboardRecList({ initialRecs }: { initialRecs: RecommendationView[] }) {
  const [recs, setRecs] = useState(initialRecs);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  async function deleteRec(slug: string) {
    setDeletingSlug(slug);
    const res = await fetch(`/api/recs/${slug}`, { method: "DELETE" });
    if (res.ok) {
      // Deleted slugs are never reissued (criterion 7) — dropping it from
      // local state without a refetch is safe.
      setRecs((current) => current.filter((rec) => rec.slug !== slug));
    }
    setDeletingSlug(null);
  }

  if (recs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You have not shared anything yet.
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
                {rec.caption ? (
                  <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
                    {rec.caption}
                  </h2>
                ) : (
                  <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-muted-foreground">
                    Untitled
                  </h2>
                )}
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
          </div>
        </li>
      ))}
    </ul>
  );
}
