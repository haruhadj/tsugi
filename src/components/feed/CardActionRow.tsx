import { ShareListButton } from "@/components/ShareListButton";
import { VoteButtons } from "@/components/VoteButtons";
import type { FeedEntry } from "@/server/services/lists";
import { cn } from "@/lib/utils";

/** Everything interactive over the card's link-overlay needs this — see FeedList's LINK_OVERLAY. */
const OVER_LINK_OVERLAY = "relative z-10";

/**
 * The vote-and-share action row shared by `StreamCard` and `CompactRow` —
 * each used to reimplement this pairing (`VoteButtons` at `size="md"` beside
 * a share pill) with only cosmetic wrapper differences. `GridCard` shows
 * votes alone, with no share button, so it does not use this.
 *
 * `className` carries each caller's own layout (wrap/order/basis rules);
 * `OVER_LINK_OVERLAY` is always applied since this always sits over a
 * full-card link overlay.
 */
export function CardActionRow({
  entry,
  className,
}: {
  entry: FeedEntry;
  className?: string;
}) {
  return (
    <div className={cn(OVER_LINK_OVERLAY, className)}>
      <VoteButtons
        slug={entry.slug}
        initialScore={entry.score}
        initialDirection={entry.myDirection}
        size="md"
      />
      <ShareListButton
        variant="pill"
        url={
          typeof window === "undefined"
            ? `/r/${entry.slug}`
            : `${window.location.origin}/r/${entry.slug}`
        }
        text={entry.name}
      />
    </div>
  );
}
