import Link from "next/link";
import { CardActionRow } from "@/components/feed/CardActionRow";
import { AuthorTag, CategoryChip, GenreChips, Meta, MultiGenreBadge } from "@/components/feed/chips";
import { Filmstrip } from "@/components/feed/Filmstrip";
import type { FeedEntry } from "@/server/services/lists";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The link-overlay pattern: the title's `<Link>` grows a full-card pseudo-element
 * so the whole row is a click target, while staying a real anchor — keyboard
 * focus, middle-click and open-in-new-tab all keep working. A `div` with an
 * `onClick` would look identical and silently lose all three (ui-rules.md:
 * never strip a primitive's behaviour to match a mockup).
 *
 * Everything interactive that sits *over* the overlay needs `relative z-10`, or
 * the overlay swallows it — that is what `OVER_LINK_OVERLAY` marks.
 */
const LINK_OVERLAY = "after:absolute after:inset-0 after:content-['']";
const OVER_LINK_OVERLAY = "relative z-10";

/** A full-width two-row cover preview beneath the list details. */
export function StreamCard({ entry }: { entry: FeedEntry }) {
  const published = entry.publishedAt ?? entry.createdAt;
  const age = formatRelativeTime(published);

  return (
    <li
      className={cn(
        "relative flex flex-col gap-4 border-b border-border px-4 py-5 transition-colors",
        "md:rounded-xl md:border md:bg-card/40 md:p-5 md:hover:border-input",
      )}
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip name={entry.category} />
          <MultiGenreBadge genres={entry.genres} />
          <AuthorTag username={entry.authorUsername} />
          {age && (
            <time dateTime={toDateTimeAttribute(published)} className="font-mono text-[11px] text-muted-foreground">
              {age}
            </time>
          )}
        </div>

        <Link
          href={`/r/${entry.slug}`}
          className={cn(
            "min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            LINK_OVERLAY,
          )}
        >
          <h2 className="line-clamp-2 font-display text-xl leading-tight font-bold tracking-[-0.02em] text-foreground md:text-2xl">
            {entry.name}
          </h2>
        </Link>
        {entry.caption && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {entry.caption}
          </p>
        )}
        <div>
          <Meta entry={entry} />
        </div>
        <div className={OVER_LINK_OVERLAY}>
          <GenreChips genres={entry.genres} />
        </div>
      </div>

      <Filmstrip covers={entry.covers} />

      <CardActionRow
        entry={entry}
        className="flex flex-wrap items-center gap-2 md:gap-1.5 md:border-t md:border-border md:pt-3"
      />
    </li>
  );
}
