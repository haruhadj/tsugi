"use client";

import {
  BookOpenIcon,
  FilterIcon,
  SearchIcon,
  SparklesIcon,
  TvIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { SegmentedRadioGroup } from "@/components/SegmentedRadioGroup";
import { Input } from "@/components/ui/input";
import { buildFeedHref, FEED_SEARCH_MIN_LENGTH, type FeedUrlState } from "@/lib/feed-params";
import type { FeedMediaTypeCounts } from "@/server/services/lists";
import { cn } from "@/lib/utils";

/**
 * The rundown's three interactive sidebar controls. They are the only client
 * leaves on an otherwise server-rendered page: each one writes to the URL and
 * lets the server component above re-render, so every filter stays shareable
 * and back-button-able. None of them holds the feed's data.
 *
 * Each takes the page's plain `FeedUrlState` and calls the shared
 * `buildFeedHref` — a function cannot cross the server/client boundary, so the
 * page hands over the state rather than its href builder, and both sides go
 * through the same one implementation of "explicit undefined clears".
 */

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Pushes `?q=` as the reader types, debounced.
 *
 * `router.replace`, not `push`: a search is refined character by character, and
 * pushing would bury the page the reader arrived from under twenty history
 * entries. Below the two-character floor the param is cleared rather than sent,
 * matching what the server would do with it anyway.
 */
export function FeedSearch({ urlState }: { urlState: FeedUrlState }) {
  const router = useRouter();
  const initialQuery = urlState.q ?? "";
  const [value, setValue] = useState(initialQuery);
  // The last value we navigated for. Without it, the effect below re-navigates
  // on every render that happens to run while the input is non-empty.
  const lastPushed = useRef(initialQuery);

  useEffect(() => {
    const trimmed = value.trim();
    const next = trimmed.length >= FEED_SEARCH_MIN_LENGTH ? trimmed : "";
    if (next === lastPushed.current) return;

    const timer = setTimeout(() => {
      lastPushed.current = next;
      router.replace(buildFeedHref(urlState, { q: next || undefined }), {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, router, urlState]);

  return (
    <FeedPanel title="Search curations">
      <div className="relative mt-3">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Titles, curators, captions"
          aria-label="Search curations"
          className="pr-9 pl-9"
        />
        {value !== "" && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <XIcon className="size-3.5" aria-hidden />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>
    </FeedPanel>
  );
}

/**
 * Anime / manga, as a segmented radio group — it selects which data the feed is
 * drawn from, which is exactly the case `SegmentedRadioGroup`'s notes describe.
 *
 * `push`, not `replace`: unlike typing, this is a deliberate single choice, and
 * the back button should undo it.
 *
 * Deliberately only two formats plus All. Per-format chips (TV / Movie / OVA)
 * would need a `format` column on `list_item`; the owner's call was that the
 * anime/manga split is the distinction readers actually browse by (D50).
 */
export function FeedMediaTypeFilter({
  urlState,
  counts,
}: {
  urlState: FeedUrlState;
  counts: FeedMediaTypeCounts;
}) {
  const router = useRouter();

  return (
    <FeedPanel title="Media format">
      <SegmentedRadioGroup
        label="Media format"
        value={urlState.mediaType ?? "all"}
        // A column, not a row: three icon+word+count segments do not fit the
        // 18rem sidebar, and this reads as a list beside Categories and Genres.
        orientation="vertical"
        className="mt-3"
        onChange={(next) =>
          router.push(
            buildFeedHref(urlState, {
              mediaType: next === "all" ? undefined : next,
            }),
          )
        }
        options={[
          {
            value: "all",
            label: "All",
            icon: SparklesIcon,
            hint: String(counts.all),
          },
          {
            value: "anime",
            label: "Anime",
            icon: TvIcon,
            hint: String(counts.anime),
          },
          {
            value: "manga",
            label: "Manga",
            icon: BookOpenIcon,
            hint: String(counts.manga),
          },
        ]}
      />
    </FeedPanel>
  );
}

/**
 * The sidebar is a column beside the feed at `lg` and a disclosure below it.
 *
 * A real `<button aria-expanded aria-controls>` over a conditionally rendered
 * region, rather than a CSS-only trick: on a phone the sidebar is the *only*
 * way to reach categories, genres and search, so it has to be announced as
 * something that opens.
 */
export function FeedSidebar({
  activeFilterCount,
  children,
}: {
  activeFilterCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-controls="feed-sidebar"
        className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-medium transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
      >
        <FilterIcon className="size-3.5" aria-hidden />
        {open ? "Hide filters" : "Filters"}
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 font-mono text-[10px] tabular-nums text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
      </button>

      <div
        id="feed-sidebar"
        className={cn("flex-col gap-4", open ? "flex" : "hidden", "lg:flex")}
      >
        {children}
      </div>
    </>
  );
}

/** The sidebar's panel shell — one shape, so the five panels read as a set. */
export function FeedPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4">
      <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
