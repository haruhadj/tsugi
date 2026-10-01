import { CopyPlusIcon, Loader2Icon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { MediaCover } from "@/components/MediaCover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ListView } from "@/server/services/lists";

export function RecCard({
  rec,
  busySlug,
  confirmingSlug,
  error,
  onTogglePublish,
  onDuplicate,
  onDeleteOrConfirm,
  onClearConfirm,
}: {
  rec: ListView;
  busySlug: string | null;
  confirmingSlug: string | null;
  error: { slug: string; message: string } | null;
  onTogglePublish: (rec: ListView) => void;
  onDuplicate: (rec: ListView) => void;
  onDeleteOrConfirm: (rec: ListView) => void;
  onClearConfirm: (slug: string) => void;
}) {
  return (
    <li className="rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-input sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 gap-4">
          <MediaCover
            src={rec.items[0]?.coverImage ?? null}
            title={rec.name}
            width={64}
            height={96}
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
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                {rec.category}
              </span>
            </div>

            <Link
              href={`/r/${rec.slug}`}
              className="mt-1.5 block rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <h2 className="font-display text-lg leading-tight font-bold tracking-[-0.02em] text-foreground sm:text-xl">
                {rec.name}
              </h2>
            </Link>

            {rec.caption && (
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {rec.caption}
              </p>
            )}

            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
              {rec.items.length} title
              {rec.items.length === 1 ? "" : "s"} · {rec.views} view
              {rec.views === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-border pt-3 sm:max-w-56 sm:justify-end sm:border-0 sm:pt-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={busySlug !== null}
            onClick={() => onTogglePublish(rec)}
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
            asChild
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <Link href={`/r/${rec.slug}/edit`}>
              <PencilIcon aria-hidden />
              Edit
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            disabled={busySlug !== null}
            aria-label={`Duplicate ${rec.name}`}
            onClick={() => onDuplicate(rec)}
          >
            <CopyPlusIcon aria-hidden />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-full text-muted-foreground",
              confirmingSlug === rec.slug && "text-destructive",
            )}
            disabled={busySlug !== null}
            onClick={() => onDeleteOrConfirm(rec)}
            onBlur={() => onClearConfirm(rec.slug)}
          >
            {confirmingSlug === rec.slug ? "Delete for good" : "Delete"}
          </Button>
        </div>
      </div>

      {error?.slug === rec.slug && (
        <p className="mt-3 font-mono text-[11px] text-destructive">{error.message}</p>
      )}
    </li>
  );
}
