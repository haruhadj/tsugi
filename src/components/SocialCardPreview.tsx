"use client";

import { SparklesIcon } from "lucide-react";
import { MediaCover } from "@/components/MediaCover";

/**
 * What the link will look like when it is pasted somewhere — shown live in the
 * builder so the author can see the card before committing to it.
 *
 * **This is a DOM approximation, not the card itself.** Two real renderers
 * already exist and neither can run here: `/r/[slug]/opengraph-image.tsx`
 * (Satori, server-side, for crawlers) and `src/lib/canvasExport.ts` (canvas, for
 * "download PNG"). Both need a saved list, and this runs before one exists. So
 * this is a third surface showing the same design, and the three have to be
 * changed together — the two real ones already carry that warning in their own
 * headers, and invariant 5 names both as hand-copied palettes.
 *
 * Kept in tokens rather than the hex those two use: this one renders through
 * Tailwind like every other component, so it has no reason to hardcode colour.
 */
export function SocialCardPreview({
  title,
  subtitle,
  comment,
  category,
  items,
}: {
  title: string;
  subtitle: string | null;
  comment: string | null;
  category: string;
  items: { title: string; coverImage: string | null }[];
}) {
  const covers = items.slice(0, 5);

  return (
    <figure className="flex flex-col gap-2">
      {/*
        aspect-[1200/630] rather than a fixed height: the real card is exactly
        that ratio, and matching it is the only way the preview tells the truth
        about what gets cropped.
      */}
      <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-8">
        <div
          className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-highlight/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="brand-gradient flex size-7 items-center justify-center rounded-lg font-mono text-sm font-bold text-primary-foreground"
                aria-hidden="true"
              >
                次
              </span>
              <span className="font-display text-sm font-extrabold tracking-tight text-foreground">
                Tsugi
              </span>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-primary">
              {category}
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="line-clamp-2 font-display text-lg leading-tight font-extrabold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h3>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
            )}
            {comment && (
              <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/80 sm:text-xs">
                {comment}
              </p>
            )}
          </div>

          <div className="flex items-end justify-between gap-4">
            {covers.length > 0 ? (
              <div className="flex" aria-hidden="true">
                {covers.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className={index === 0 ? "" : "-ml-5 sm:-ml-6"}
                  >
                    <MediaCover
                      src={item.coverImage}
                      title=""
                      width={48}
                      height={68}
                      className="rounded-md ring-2 ring-card"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 font-mono text-[10px] text-muted-foreground">
                Covers appear as you add titles
              </p>
            )}

            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {items.length} {items.length === 1 ? "title" : "titles"}
            </span>
          </div>
        </div>
      </div>

      <figcaption className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        <SparklesIcon className="size-3 text-primary" aria-hidden="true" />
        Approximate 1200×630 preview — the published card is rendered server-side.
      </figcaption>
    </figure>
  );
}
