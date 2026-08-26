import Link from "next/link";
import { AuthorTag, CategoryChip, GenreChips, Meta, MultiGenreBadge } from "@/components/feed/chips";
import { MediaCover } from "@/components/MediaCover";
import { VoteButtons } from "@/components/VoteButtons";
import type { FeedEntry } from "@/server/services/lists";
import { cn } from "@/lib/utils";

const LINK_OVERLAY = "after:absolute after:inset-0 after:content-['']";
const OVER_LINK_OVERLAY = "relative z-10";

export function GridCard({ entry }: { entry: FeedEntry }) {
  return (
    <li className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-input">
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip name={entry.category} />
        <MultiGenreBadge genres={entry.genres} />
      </div>

      <Link
        href={`/r/${entry.slug}`}
        className={cn(
          "rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          LINK_OVERLAY,
        )}
      >
        <h2 className="line-clamp-2 font-display leading-tight font-bold tracking-[-0.01em] text-foreground">
          {entry.name}
        </h2>
      </Link>

      <AuthorTag username={entry.authorUsername} />

      {/*
        The covers overlap into a fanned stack — a deliberately decorative
        treatment, unlike the stream's filmstrip, so it keeps its aria-hidden:
        overlapping art cannot be read in order and the titles are one click away.
        Each is `flex-1` so they share the card's width evenly and grow to fill
        it; the negative margin overlaps them, and `ring-card` draws the seam
        between. The first stays flush with the card's left padding, and the
        flex growth carries the last one out to the right edge, so there is no
        dead space beside the stack whatever the card's width. `basis-0` keeps
        the split even regardless of the covers' intrinsic size.
      */}
      {entry.covers.length > 0 && (
        <ul aria-hidden className="flex">
          {entry.covers.map((cover, index) => (
            <li
              key={`${cover.title}-${index}`}
              className={cn("min-w-0 flex-1 basis-0", index > 0 && "-ml-4")}
              // Later covers sit on top of earlier ones, so the fan reads
              // left-over-right like a spread hand rather than the reverse.
              style={{ zIndex: index }}
            >
              <MediaCover
                src={cover.coverImage}
                title=""
                width={56}
                height={84}
                fluid
                className="rounded-md ring-2 ring-card"
              />
            </li>
          ))}
        </ul>
      )}

      <div className={OVER_LINK_OVERLAY}>
        <GenreChips genres={entry.genres} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <Meta entry={entry} />
        <VoteButtons
          slug={entry.slug}
          initialScore={entry.score}
          initialDirection={entry.myDirection}
          size="touch"
          className={OVER_LINK_OVERLAY}
        />
      </div>
    </li>
  );
}
