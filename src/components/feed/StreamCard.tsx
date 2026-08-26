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

/**
 * The rundown's default row — the same shape at every width.
 *
 * Used to shed the chip row, caption, genre links and filmstrip below `md`
 * for a compact Reddit-style thumbnail card, but that made the phone and
 * desktop feeds read as two different products. It is one card now: the
 * `md:` variants below only ever adjust spacing, borders and text size, never
 * which content renders — a phone pays a few more image requests for the
 * filmstrip, same as desktop does, `next/image` lazy-loading the ones still
 * off screen.
 *
 * Link-overlaid at every width: the title's `Link` grows a full-card
 * pseudo-element (`LINK_OVERLAY`) so empty space anywhere on the row opens
 * the list, the way the rest of the row already reads as one card. Genre
 * chips, vote buttons and the share button sit above that overlay
 * (`OVER_LINK_OVERLAY`) so they stay their own click targets instead of being
 * swallowed by it.
 */
export function StreamCard({ entry }: { entry: FeedEntry }) {
  const published = entry.publishedAt ?? entry.createdAt;
  const age = formatRelativeTime(published);

  return (
    <li
      className={cn(
        "relative flex flex-col gap-2 border-b border-border px-4 py-3 transition-colors",
        "md:gap-1 md:rounded-md md:border md:bg-card/40 md:p-2.5 md:hover:border-input",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip name={entry.category} />
        <MultiGenreBadge genres={entry.genres} />
        <AuthorTag username={entry.authorUsername} />
        {age && (
          <time
            dateTime={toDateTimeAttribute(published)}
            className="font-mono text-[11px] text-muted-foreground"
          >
            {age}
          </time>
        )}
      </div>

      <div className="min-w-0">
        <Link
          href={`/r/${entry.slug}`}
          className={cn(
            "min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            LINK_OVERLAY,
          )}
        >
          <h2 className="line-clamp-2 font-display text-base leading-tight font-bold tracking-[-0.01em] text-foreground md:text-[13px]">
            {entry.name}
          </h2>
        </Link>
        {entry.caption && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground md:mt-0.5">
            {entry.caption}
          </p>
        )}
        <div className="mt-1.5 md:mt-1">
          <Meta entry={entry} />
        </div>
      </div>

      <div className={OVER_LINK_OVERLAY}>
        <GenreChips genres={entry.genres} />
      </div>

      <Filmstrip covers={entry.covers} />

      <CardActionRow
        entry={entry}
        className="flex flex-wrap items-center gap-2 md:justify-start md:gap-1.5"
      />
    </li>
  );
}
