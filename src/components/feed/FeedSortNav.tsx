import { CheckIcon, ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { SORTS } from "@/components/feed/sortOptions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HrefFor } from "@/lib/feed-params";
import { FEED_SORTS, type FeedSort } from "@/server/services/lists";

/**
 * The desktop sort control. Built in the page rather than inline in `FeedList`
 * because it lays out around `FeedList`'s own density toggle: the dropdown
 * shares the toggle's row, the filter bar sits under it. A dropdown rather
 * than a chip rail from `md` up, so sort reads as its own control instead of
 * blending into the view dropdown beside it.
 */
export function FeedSortNav({ sort, hrefFor }: { sort: FeedSort; hrefFor: HrefFor }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Sort"
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:inline-flex"
        >
          {(() => {
            const { icon: Icon } = SORTS[sort];
            return <Icon className="size-3.5" aria-hidden />;
          })()}
          {SORTS[sort].label}
          <ChevronDownIcon className="size-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {FEED_SORTS.map((option) => {
          const { label, icon: Icon } = SORTS[option];
          return (
            <DropdownMenuItem key={option} asChild>
              <Link
                href={hrefFor({ sort: option })}
                aria-current={sort === option ? "true" : undefined}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
                {sort === option && (
                  <CheckIcon className="ml-auto size-3.5" aria-hidden />
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
