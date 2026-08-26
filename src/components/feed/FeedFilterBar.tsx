import { XIcon } from "lucide-react";
import Link from "next/link";
import type { ListCategory } from "@/lib/categories";
import type { HrefFor } from "@/lib/feed-params";
import type { MediaType } from "@/lib/types/media";

/**
 * The active-filter bar. `FeedPage` only renders this when something is
 * actually filtering — an always-present empty bar would be chrome that
 * teaches nothing.
 */
export function FeedFilterBar({
  category,
  genre,
  mediaType,
  q,
  hrefFor,
}: {
  category?: ListCategory;
  genre?: string;
  mediaType?: MediaType;
  q?: string;
  hrefFor: HrefFor;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/40 p-2.5">
      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Filtered
      </span>
      {category && (
        <Link
          href={hrefFor({ category: undefined })}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-primary transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {category}
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove category filter</span>
        </Link>
      )}
      {genre && (
        <Link
          href={hrefFor({ genre: undefined })}
          className="inline-flex items-center gap-1 rounded-full border border-highlight/30 bg-highlight/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-highlight transition-colors hover:border-highlight/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          #{genre}
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove genre filter</span>
        </Link>
      )}
      {mediaType && (
        <Link
          href={hrefFor({ mediaType: undefined })}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {mediaType}
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove media format filter</span>
        </Link>
      )}
      {q && (
        <Link
          href={hrefFor({ q: undefined })}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          &ldquo;{q}&rdquo;
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove search</span>
        </Link>
      )}
      <Link
        href={hrefFor({
          category: undefined,
          genre: undefined,
          mediaType: undefined,
          q: undefined,
        })}
        className="ml-auto text-xs text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Clear all
      </Link>
    </div>
  );
}
