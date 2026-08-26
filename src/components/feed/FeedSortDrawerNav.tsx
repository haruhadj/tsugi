import Link from "next/link";
import { SORTS } from "@/components/feed/sortOptions";
import { FeedSortDrawer } from "@/components/FeedSortDrawer";
import type { HrefFor } from "@/lib/feed-params";
import { cn } from "@/lib/utils";
import { FEED_SORTS, type FeedSort } from "@/server/services/lists";

/**
 * The phone form of `FeedSortNav`. `FeedList` shows this in the sticky band
 * instead of the chips, which do not fit four abreast on a phone.
 */
export function FeedSortDrawerNav({ sort, hrefFor }: { sort: FeedSort; hrefFor: HrefFor }) {
  return (
    <FeedSortDrawer label={SORTS[sort].label}>
      {/*
        Wrapped in a fragment, not handed over as a bare array: `children`
        crossing into a Client Component is serialized as a prop, and an array
        prop arrives without the keys JSX gave it — which React then reports as
        a missing-key warning inside FeedList. The same reason FeedBrowseDrawer
        is given the directory as one fragment.
      */}
      <>
        {FEED_SORTS.map((option) => {
          const { label, icon: Icon } = SORTS[option];
          return (
            <Link
              key={option}
              href={hrefFor({ sort: option })}
              aria-current={sort === option ? "true" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                sort === option
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </>
    </FeedSortDrawer>
  );
}
