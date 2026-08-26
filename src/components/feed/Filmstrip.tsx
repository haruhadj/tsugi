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
 * Each cover is `flex-1` so the strip divides the row's whole width between
 * however many covers there are, rather than sitting at a fixed size and
 * scrolling — no cap on that growth, or a short list would leave the leftover
 * width unfilled at the end of the row instead of resolving to a share for
 * each cover. `fluid` on `MediaCover` is what lets the art itself grow to fill
 * that flexible slot instead of rendering at its 56×84 intrinsic size.
 *
 * Rendered at every width `StreamCard` appears at, five to a row (see the
 * grid below), so a 390px screen still gives each cover ~70px rather than the
 * ~35px a single ten-wide row would leave it.
 */
export function Filmstrip({ covers }: { covers: FeedCover[] }) {
  if (covers.length === 0) return null;

  return (
    /*
      Five to a row, two rows deep for a full ten-cover list — the card-view
      grid Reddit uses. One row of ten squeezed each cover to about half a
      thumbnail's width at this card's size, too narrow to recognise the art;
      halving the count per row doubles it back. A short list simply leaves the
      trailing cells empty rather than stretching to fill the row, so covers are
      the same size on every card in the feed.
    */
    <ul
      aria-label="Leading titles"
      className="grid grid-cols-5 items-start gap-2"
    >
      {covers.map((cover, index) => (
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
              className="px-1 text-[9px]"
            />
          )}
        </li>
      ))}
    </ul>
  );
}
