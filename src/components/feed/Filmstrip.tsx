import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { FeedCover } from "@/server/services/lists";

/**
 * The lead titles, badged with their rank and score.
 *
 * This used to be `aria-hidden` decoration because `FeedEntry` carried nothing
 * but image URLs — captioning it would have meant inventing alt text. Now that
 * each cover arrives with its title and `(raw, format)` score pair, the strip
 * says something the row does not, so it is exposed.
 *
 * A five-column grid gives every visible cover the same width. `fluid` on
 * `MediaCover` lets the art fill its cell instead of keeping a fixed width.
 *
 * The stream shows up to ten covers in two rows. The landing preview uses five
 * so its featured card stays compact.
 */
export function Filmstrip({
  covers,
  limit = 10,
}: {
  covers: FeedCover[];
  limit?: 5 | 10;
}) {
  if (covers.length === 0) return null;

  return (
    <ul
      aria-label="Leading titles"
      className="grid grid-cols-5 items-start gap-2"
    >
      {covers.slice(0, limit).map((cover, index) => (
        <li
          key={`${cover.title}-${index}`}
          className="flex min-w-0 flex-col items-center gap-1"
        >
          <div className="relative w-full">
            <MediaCover
              src={cover.coverImage}
              title={cover.title}
              width={56}
              height={84}
              fluid
              className="rounded-md"
            />
            {/* The rank restates the cover's position in a list that is already
                ordered, so it is decoration for anyone reading the markup. */}
            <span
              aria-hidden
              className="absolute top-0 left-0 rounded-tl-md rounded-br-md bg-background/85 px-1 font-mono text-[9px] font-bold tabular-nums text-foreground"
            >
              {index + 1}
            </span>
          </div>
          {cover.scoreRaw !== null && cover.scoreFormat !== null && (
            // Below the cover rather than over it: at 56px wide a POINT_100
            // score would cover the art it is annotating.
            <ScoreBadge
              scoreRaw={cover.scoreRaw}
              scoreFormat={cover.scoreFormat}
              size="sm"
              className="px-1 text-[10px]"
            />
          )}
        </li>
      ))}
    </ul>
  );
}
