import Link from "next/link";
import { CardActionRow } from "@/components/feed/CardActionRow";
import { GenreChips } from "@/components/feed/chips";
import { MediaCover } from "@/components/MediaCover";
import type { FeedEntry } from "@/server/services/lists";
import { cn } from "@/lib/utils";

const LINK_OVERLAY = "after:absolute after:inset-0 after:content-['']";
const OVER_LINK_OVERLAY = "relative z-10";

/**
 * On a phone this reorders around the same three children rather than
 * swapping in different markup: the cover moves to the DOM's visual right
 * (`order-2`) beside the content, and the vote-and-share group drops to a row
 * of its own underneath (`basis-full` forces the wrap) instead of sitting in
 * that top line — which is also why it ends up left-aligned there for free,
 * being the only thing on its line. From `md` every `order-none` cancels
 * out and the row goes back to the original single-line cover / content /
 * actions layout.
 */
export function CompactRow({ entry }: { entry: FeedEntry }) {
  return (
    <li className="relative flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 transition-colors md:flex-nowrap md:gap-4 md:rounded-xl md:border md:bg-card/40 md:hover:border-input">
      <div className="order-1 min-w-0 flex-1 md:order-none">
        <Link
          href={`/r/${entry.slug}`}
          className={cn(
            "rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            LINK_OVERLAY,
          )}
        >
          <h2 className="truncate text-sm leading-tight font-semibold text-foreground">
            {entry.name}
          </h2>
        </Link>
        <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span className="truncate">{entry.category}</span>
          {entry.authorUsername && (
            <span className="truncate">u/{entry.authorUsername}</span>
          )}
          <span className="hidden md:inline">{entry.itemCount} titles</span>
          <span className="hidden md:inline">{entry.views} views</span>
        </div>
        <div className={cn("mt-2", OVER_LINK_OVERLAY)}>
          <GenreChips genres={entry.genres} />
        </div>
      </div>

      <MediaCover
        src={entry.covers[0]?.coverImage ?? null}
        title={entry.name}
        width={36}
        height={54}
        className="order-2 shrink-0 rounded-md md:order-none"
      />

      {/*
        Same action-row shape `StreamCard` uses: the vote pill at `size="md"`
        beside a share button, rather than `VoteButtons` alone. `basis-full`
        wraps it to its own row on a phone the same way it did before — a
        plain wrapper div left-aligns by default, so this replaces the
        `items-start` override that only `VoteButtons`' own alignment needed.
      */}
      <CardActionRow
        entry={entry}
        className="order-3 flex basis-full flex-wrap items-center gap-2 md:order-none md:basis-auto md:gap-1.5"
      />
    </li>
  );
}
