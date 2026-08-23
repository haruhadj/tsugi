import {
  ClockIcon,
  CompassIcon,
  EyeIcon,
  FlameIcon,
  ListOrderedIcon,
  PlusIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { FeedBrowseDrawer } from "@/components/FeedBrowseDrawer";
import { FeedMediaTypeFilter, FeedPanel, FeedSearch } from "@/components/FeedControls";
import { FeedList } from "@/components/FeedList";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth";
import { isListCategory } from "@/lib/categories";
import {
  buildFeedHref,
  normalizeFeedQuery,
  normalizeMediaType,
  type FeedUrlState,
} from "@/lib/feed-params";
import { cn } from "@/lib/utils";
import {
  FEED_SORTS,
  countPublishedLists,
  listFeedCategories,
  listFeedGenres,
  listFeedMediaTypeCounts,
  listPublishedFeed,
  type FeedSort,
} from "@/server/services/lists";

type SearchParams = Promise<{
  sort?: string;
  page?: string;
  category?: string;
  genre?: string;
  mediaType?: string;
  q?: string;
}>;

const PAGE_SIZE = 20;

const SORTS: Record<FeedSort, { label: string; icon: LucideIcon }> = {
  top: { label: "Top", icon: FlameIcon },
  new: { label: "New", icon: ClockIcon },
  views: { label: "Most viewed", icon: EyeIcon },
  items: { label: "Longest", icon: ListOrderedIcon },
};

function isFeedSort(value: string | undefined): value is FeedSort {
  return value !== undefined && (FEED_SORTS as readonly string[]).includes(value);
}

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sort: FeedSort = isFeedSort(params.sort) ? params.sort : "top";
  const pageParam = Number(params.page ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  // An unrecognised category falls back to the whole rundown rather than an
  // empty page — a bookmarked chip from before D48's vocabulary should still
  // show something to read.
  const category =
    params.category && isListCategory(params.category) ? params.category : undefined;
  const genre = params.genre || undefined;
  const mediaType = normalizeMediaType(params.mediaType);
  const q = normalizeFeedQuery(params.q);

  const filters = { category, genre, mediaType, q };

  const [session, entries, categories, genres, mediaTypeCounts, totalPublished] =
    await Promise.all([
      getServerSession(),
      listPublishedFeed({ page, pageSize: PAGE_SIZE, sort, ...filters }),
      listFeedCategories(filters),
      listFeedGenres(filters),
      listFeedMediaTypeCounts(filters),
      // Unfiltered on purpose — the CTA's "N published so far" is a fact about
      // the product, not about the reader's current filter.
      countPublishedLists(),
    ]);

  // Handed to the client controls, which build their own hrefs from it.
  const urlState: FeedUrlState = { sort, page, ...filters };
  const hrefFor = (next: Parameters<typeof buildFeedHref>[1] = {}) =>
    buildFeedHref(urlState, next);

  const activeFilters = [category, genre, mediaType, q].filter(Boolean).length;
  const hasFilter = activeFilters > 0;

  // Slot numbers continue across pages: page 2 opens at 21, not at 1. They are
  // the sort order made visible, so they have to keep counting to stay true.
  const firstSlot = (page - 1) * PAGE_SIZE + 1;

  const matchingLists = categories.reduce((sum, entry) => sum + entry.count, 0);

  // The rundown's directory: search, media format, categories, genres, and the
  // account panel. Previously a permanent 18rem column beside the feed; now handed
  // to FeedList, which puts it behind a Browse drawer so the stream rows get the
  // page's whole width (see FeedList and FeedBrowseDrawer).
  const directory = (
    <>
      <FeedSearch urlState={urlState} />

      <FeedMediaTypeFilter urlState={urlState} counts={mediaTypeCounts} />

      {categories.length > 0 && (
        <nav aria-label="Categories" className="rounded-2xl border border-border bg-card/60 p-4">
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Categories
          </h2>
          <ul className="mt-3 flex flex-col">
            <li>
              <Link
                href={hrefFor({ category: undefined })}
                aria-current={category === undefined ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  category === undefined
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="truncate">All</span>
                {/* The other filters still apply, so this is how many the reader
                    would see with the category cleared — not the global total
                    the account panel below quotes. */}
                <span className="font-mono text-[11px] tabular-nums">{matchingLists}</span>
              </Link>
            </li>
            {categories.map((entry) => (
              <li key={entry.name}>
                <Link
                  href={hrefFor({ category: entry.name })}
                  aria-current={category === entry.name ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    category === entry.name
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="truncate">{entry.name}</span>
                  <span className="font-mono text-[11px] tabular-nums">{entry.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/*
        Genres sit below categories and read differently on purpose: a category is
        where the author filed the list, a genre is what the titles on it actually
        are. Same directory shape, amber rather than the category's neutral
        selection, matching the chips on the rows themselves.
      */}
      {genres.length > 0 && (
        <nav aria-label="Genres" className="rounded-2xl border border-border bg-card/60 p-4">
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Genres
          </h2>
          <ul className="mt-3 flex flex-col">
            {genres.map((entry) => (
              <li key={entry.name}>
                <Link
                  href={hrefFor({ genre: genre === entry.name ? undefined : entry.name })}
                  aria-current={genre === entry.name ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    genre === entry.name
                      ? "bg-highlight/15 text-highlight"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="truncate font-mono text-xs">#{entry.name}</span>
                  <span className="font-mono text-[11px] tabular-nums">{entry.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/*
        The drawer's last slot is an invitation rather than a description: a reader
        who opened the drawer already knows what the rundown is, so the space is
        worth more as the next step.
      */}
      <FeedPanel title="Your rundown">
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
            <dt className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              Curations
            </dt>
            <dd className="mt-0.5 font-display text-lg font-bold tabular-nums">
              {totalPublished}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
            <dt className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              Sources
            </dt>
            <dd className="mt-0.5 text-sm font-semibold">AniList + MAL</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Score the anime and manga you would hand to someone and yours joins them as a link
          worth sending.
        </p>
        <Button asChild size="sm" className="mt-4 w-full rounded-full">
          <Link href={session === null ? "/sign-in" : "/"}>
            <PlusIcon className="size-4" aria-hidden />
            {session === null ? "Sign in to build one" : "Build one"}
          </Link>
        </Button>
      </FeedPanel>
    </>
  );

  // Built here rather than inline below because FeedList lays them out around its own
  // density toggle: the sort tabs share the toggle's row, the filter bar sits under it.
  const sortNav = (
    <nav aria-label="Sort" className="flex flex-wrap items-center gap-1">
      {FEED_SORTS.map((option) => {
        const { label, icon: Icon } = SORTS[option];
        return (
          <Link
            key={option}
            href={hrefFor({ sort: option })}
            aria-current={sort === option ? "true" : undefined}
            title={label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              sort === option
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {/* Icon always renders, label hides under `sm` — the same rule the
                density toggle beside this already follows, so the two halves of
                the toolbar collapse together rather than one at a time. */}
            <Icon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  // The active-filter bar. Only built when something is actually filtering — an
  // always-present empty bar would be chrome that teaches nothing.
  const filterBar = hasFilter ? (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/40 p-2.5">
      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        Filtered
      </span>
      {category && (
        <Link
          href={hrefFor({ category: undefined })}
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-primary transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {category}
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove category filter</span>
        </Link>
      )}
      {genre && (
        <Link
          href={hrefFor({ genre: undefined })}
          className="inline-flex items-center gap-1 rounded-full border border-highlight/30 bg-highlight/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-highlight transition-colors hover:border-highlight/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          #{genre}
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove genre filter</span>
        </Link>
      )}
      {mediaType && (
        <Link
          href={hrefFor({ mediaType: undefined })}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {mediaType}
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove media format filter</span>
        </Link>
      )}
      {q && (
        <Link
          href={hrefFor({ q: undefined })}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          &ldquo;{q}&rdquo;
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove search</span>
        </Link>
      )}
      <Link
        href={hrefFor({
          category: undefined,
          genre: undefined,
          mediaType: undefined,
          q: undefined,
        })}
        className="ml-auto text-xs text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Clear all
      </Link>
    </div>
  ) : null;

  return (
    <div className="min-h-screen">
      <Header username={session ? (session.user.username ?? session.user.name) : null} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="animate-card-in">
          <section className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 sm:p-10">
            {/* Off-centre glow, purely decorative — kept behind the copy, never over it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/20 blur-3xl"
            />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.28em] text-primary uppercase">
                  <CompassIcon className="size-3.5" aria-hidden />
                  Public discovery feed
                </p>
                <h1 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
                  The rundown
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Every list people have published, ranked by what the room thinks of them.
                  Vote on the ones you have opinions about.
                </p>
              </div>
              {/* Right-aligned from `md` up, under the copy below it — the eyebrow
                  already says where you are, so the action gets the corner. */}
              <Button asChild className="rounded-full md:ml-auto">
                <Link href={session === null ? "/sign-in" : "/"}>
                  <PlusIcon aria-hidden />
                  Create &amp; share a list
                </Link>
              </Button>
            </div>
          </section>

          <div className="mt-8">
            <div className="min-w-0">
              {entries.length === 0 ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                    {sortNav}
                    <FeedBrowseDrawer filtered={hasFilter}>{directory}</FeedBrowseDrawer>
                  </div>
                  {filterBar}
                  <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                      <CompassIcon className="size-6 text-muted-foreground" aria-hidden />
                    </div>
                    <h2 className="mt-4 font-display text-lg font-bold">
                      {hasFilter ? "Nothing matches that yet" : "The rundown is empty"}
                    </h2>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      {hasFilter
                        ? "Publish a list that fits and it opens this corner of the rundown."
                        : "Publish a list and it takes slot 01."}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      {hasFilter && (
                        <Button asChild variant="outline" className="rounded-full">
                          <Link
                            href={hrefFor({
                              category: undefined,
                              genre: undefined,
                              mediaType: undefined,
                              q: undefined,
                            })}
                          >
                            Clear filters
                          </Link>
                        </Button>
                      )}
                      <Button asChild className="rounded-full">
                        <Link href="/">Make a list</Link>
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <FeedList
                  entries={entries}
                  sortNav={sortNav}
                  filterBar={filterBar}
                  browseDrawer={
                    <FeedBrowseDrawer filtered={hasFilter}>{directory}</FeedBrowseDrawer>
                  }
                />
              )}

              <div className="mt-8 flex items-center justify-between">
                {page > 1 ? (
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link href={hrefFor({ page: page - 1 })}>Back</Link>
                  </Button>
                ) : (
                  <span />
                )}
                {entries.length === PAGE_SIZE ? (
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link href={hrefFor({ page: page + 1 })}>
                      Slot {firstSlot + PAGE_SIZE} onward
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
