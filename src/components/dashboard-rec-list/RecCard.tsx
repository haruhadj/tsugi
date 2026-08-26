import { CopyPlusIcon, ExternalLinkIcon, Loader2Icon, PencilIcon } from "lucide-react";
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
    <li className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
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
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                {rec.category}
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

        <div className="flex shrink-0 flex-wrap items-center gap-1">
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

          {/*
            Edit (D59). A link, not a button: it navigates rather than
            acting, so middle-click and open-in-new-tab work and it is
            unaffected by `busySlug`.
          */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
          >
            <Link href={`/r/${rec.slug}/edit`} aria-label={`Edit ${rec.name}`}>
              <PencilIcon aria-hidden />
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
            onClick={() => onDeleteOrConfirm(rec)}
            onBlur={() => onClearConfirm(rec.slug)}
          >
            {confirmingSlug === rec.slug ? "Delete for good" : "Delete"}
          </Button>
        </div>
      </div>

      {rec.items.length > 1 && (
        <ul aria-hidden className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {rec.items.map((item) => (
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
        <p className="mt-3 font-mono text-[11px] text-destructive">{error.message}</p>
      )}
    </li>
  );
}
