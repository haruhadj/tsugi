"use client";

import {
  LayoutGridIcon,
  LayoutListIcon,
  Loader2Icon,
  RefreshCwIcon,
  Rows3Icon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { CompactRow } from "@/components/feed/CompactRow";
import { GridCard } from "@/components/feed/GridCard";
import { StreamCard } from "@/components/feed/StreamCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { PULL_THRESHOLD, usePullToRefresh } from "@/hooks/usePullToRefresh";
import type { FeedEntry } from "@/server/services/lists";
import { FEED_PAGE_SIZE, type FeedUrlState } from "@/lib/feed-params";
import { cn } from "@/lib/utils";

const DENSITIES = [
  { id: "stream", label: "Stream", icon: LayoutListIcon },
  { id: "classic", label: "Compact", icon: Rows3Icon },
  { id: "grid", label: "Grid", icon: LayoutGridIcon },
] as const;

type Density = (typeof DENSITIES)[number]["id"];

/**
 * The feed's rows, in one of three densities. Density is client state and never a URL
 * param: it is a reading preference, not part of what the page is showing, so it must
 * not change what a shared /feed link resolves to. Sort, category and page do all live
 * in the URL, and are owned by the server component above this one.
 *
 * `sortNav`, `sortDrawer`, `filterBar` and `pagination` are rendered by
 * the server and
 * handed down rather than placed above this component: the sort control shares the density
 * toggle's sticky rail, and the pagination links have to be able to disappear once
 * infinite scroll has taken over, which is client state.
 *
 * `urlState` is the same object the server built its own hrefs from. It is what lets
 * this component ask `GET /api/feed` for page N+1 of *the reader's current filter*
 * rather than of the unfiltered rundown.
 */
export function FeedList({
  entries,
  sortNav,
  sortDrawer,
  filterBar,
  pagination,
  urlState,
}: {
  entries: FeedEntry[];
  sortNav: ReactNode;
  sortDrawer?: ReactNode;
  filterBar?: ReactNode;
  pagination?: ReactNode;
  urlState: FeedUrlState;
}) {
  const [density, setDensity] = useState<Density>("stream");
  const activeDensity = DENSITIES.find((option) => option.id === density);
  const { appended, status, sentinelRef, retry } = useInfiniteFeed(
    entries,
    urlState,
  );
  const { pull, refreshing } = usePullToRefresh();

  const rows = appended.length === 0 ? entries : [...entries, ...appended];

  return (
    <div>
      {/*
        One bar: sort chips and density. It pins under the header on a phone —
        the rundown is a long scroll and the sort you are reading in is the
        thing you most want to change halfway down it — and relaxes into the
        ordinary card toolbar from `md`, where the whole page is visible at
        once and a second sticky band would just eat height.

        The negative margin lets the sticky band's blurred ground reach the
        screen edges inside `main`'s padding, so rows scroll under it instead of
        past a floating island.
      */}
      <div
        className={cn(
          "top-16 z-30 -mx-4 border-b border-border bg-background/90 px-4 py-2 backdrop-blur-xl",
          "md:static md:mx-0 md:rounded-2xl md:border md:bg-card/60 md:p-2 md:backdrop-blur-none",
        )}
      >
        <div className="flex items-center gap-2">
          {/*
            Two forms of one control. On a phone the four sorts cannot sit in
            this band without scrolling sideways, and a sideways scroll hides
            the options it holds, so the drawer shows the current sort and
            opens the rest over the feed. From `md` the chips fit outright and
            are worth the glanceability; each half hides itself at the other's
            breakpoint. `overflow-x-auto` stays as the chips' last resort at
            narrow desktop widths — wrapping would change this band's height and
            shift every row under it.
          */}
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sortDrawer}
            {sortNav}
            <div
              aria-hidden
              className="mx-2 h-5 w-px shrink-0 bg-border"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {activeDensity && (
                    <activeDensity.icon className="size-3.5" aria-hidden />
                  )}
                  {activeDensity?.label}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuRadioGroup
                  value={density}
                  onValueChange={(value) => setDensity(value as Density)}
                >
                  {DENSITIES.map((option) => (
                    <DropdownMenuRadioItem key={option.id} value={option.id}>
                      <option.icon className="size-3.5" aria-hidden />
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {filterBar}

      {/*
        Pull-to-refresh's only visible part. It sits in the flow rather than
        over the feed, so nothing is ever covered by it, and it is `aria-hidden`
        because the refresh it announces is a full navigation the router already
        narrates. Height follows the drag directly — this is a gesture, and a
        transition on it would make the indicator lag the thumb.
      */}
      <div
        aria-hidden
        className="flex items-center justify-center overflow-hidden md:hidden"
        style={{ height: refreshing ? PULL_THRESHOLD : pull }}
      >
        <RefreshCwIcon
          className={cn(
            "size-5 text-muted-foreground",
            refreshing
              ? "animate-spin"
              : pull >= PULL_THRESHOLD && "text-primary",
          )}
        />
      </div>

      {density === "grid" ? (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((entry) => (
            <GridCard key={entry.slug} entry={entry} />
          ))}
        </ul>
      ) : (
        /*
          Edge-to-edge on a phone. The stream card's divider is a full-width
          hairline the way Reddit's is, which only reads as a divider if it
          actually reaches both edges; inset by `main`'s padding it looks like an
          underline on the text. From `md` the rows become discrete cards again
          and the margin comes back.
        */
        <ul className="-mx-4 mt-4 flex flex-col md:mx-0 md:mt-6 md:gap-3">
          {rows.map((entry) =>
            density === "stream" ? (
              <StreamCard key={entry.slug} entry={entry} />
            ) : (
              <CompactRow key={entry.slug} entry={entry} />
            ),
          )}
        </ul>
      )}

      {/*
        The sentinel is a plain div after the list rather than a trailing <li>:
        it is not one of the rundown's rows, and putting it inside the <ul> would
        add an empty list item to what a screen reader counts.
      */}
      <div
        ref={sentinelRef}
        className="flex min-h-12 items-center justify-center py-4"
      >
        {status === "loading" && (
          <Loader2Icon
            className="size-5 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
        {status === "error" && (
          // Inline and quiet, not an Alert: nothing was lost and the fix is one
          // tap (ui-rules.md § Errors).
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load more.{" "}
            <button
              type="button"
              onClick={retry}
              className="text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Try again
            </button>
          </p>
        )}
        {status === "done" && rows.length > FEED_PAGE_SIZE && (
          <p className="font-mono text-xs text-muted-foreground">
            That&apos;s the whole rundown.
          </p>
        )}
      </div>

      {/*
        The pagination links stay until infinite scroll has actually appended
        something. They are the route for anyone whose JS never ran, and for
        anyone who wants page 4 in their history rather than a scroll position —
        but once pages are being appended they would navigate away from rows
        already on screen, which is worse than not being there.
      */}
      {appended.length === 0 && pagination}
    </div>
  );
}
