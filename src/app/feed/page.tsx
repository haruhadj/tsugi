import {
  CheckIcon,
  ChevronDownIcon,
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
import {
  FeedBrowseProvider,
  FeedBrowseSidebar,
} from "@/components/FeedBrowseDrawer";
import {
  FeedMediaTypeFilter,
  FeedPanel,
  FeedSearch,
} from "@/components/FeedControls";
import { FeedList } from "@/components/FeedList";
import { FeedSortDrawer } from "@/components/FeedSortDrawer";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getServerSession } from "@/lib/auth";
import { isListCategory } from "@/lib/categories";
import {
  FEED_PAGE_SIZE,
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

const PAGE_SIZE = FEED_PAGE_SIZE;

const SORTS: Record<FeedSort, { label: string; icon: LucideIcon }> = {
  top: { label: "Top", icon: FlameIcon },
  new: { label: "New", icon: ClockIcon },
  views: { label: "Most viewed", icon: EyeIcon },
  items: { label: "Longest", icon: ListOrderedIcon },
};

function isFeedSort(value: string | undefined): value is FeedSort {
  return (
    value !== undefined && (FEED_SORTS as readonly string[]).includes(value)
  );
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sort: FeedSort = isFeedSort(params.sort) ? params.sort : "top";
  const pageParam = Number(params.page ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  // An unrecognised category falls back to the whole rundown rather than an
  // empty page — a bookmarked chip from before D48's vocabulary should still
  // show something to read.
  const category =
    params.category && isListCategory(params.category)
      ? params.category
      : undefined;
  const genre = params.genre || undefined;
  const mediaType = normalizeMediaType(params.mediaType);
  const q = normalizeFeedQuery(params.q);

  const filters = { category, genre, mediaType, q };

  // Awaited before the rest: the feed query needs the viewer's id to report
  // their own vote on each row, so the arrows render already lit.
  const session = await getServerSession();

  const [entries, categories, genres, mediaTypeCounts, totalPublished] =
    await Promise.all([
      listPublishedFeed({
        page,
        pageSize: PAGE_SIZE,
        sort,
        viewerId: session?.user.id ?? null,
        ...filters,
      }),
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
        <nav
          aria-label="Categories"
          className="rounded-2xl border border-border bg-card/60 p-4"
        >
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
                <span className="font-mono text-[11px] tabular-nums">
                  {matchingLists}
                </span>
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
                  <span className="font-mono text-[11px] tabular-nums">
                    {entry.count}
                  </span>
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
        <nav
          aria-label="Genres"
          className="rounded-2xl border border-border bg-card/60 p-4"
        >
          <h2 className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Genres
          </h2>
          <ul className="mt-3 flex flex-col">
            {genres.map((entry) => (
              <li key={entry.name}>
                <Link
                  href={hrefFor({
                    genre: genre === entry.name ? undefined : entry.name,
                  })}
                  aria-current={genre === entry.name ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    genre === entry.name
                      ? "bg-highlight/15 text-highlight"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="truncate font-mono text-xs">
                    #{entry.name}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums">
                    {entry.count}
                  </span>
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
          Score the anime and manga you would hand to someone and yours joins
          them as a link worth sending.
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
  // density toggle: the sort dropdown shares the toggle's row, the filter bar sits
  // under it. A dropdown rather than a chip rail from `md` up, so sort reads as its
  // own control instead of blending into the view dropdown beside it.
  const sortNav = (
    <DropdownMenu key="sort-nav">
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

  // The phone form of the same sort control. FeedList shows this in the sticky band
  // instead of the chips, which do not fit four abreast on a phone.
  const sortDrawer = (
    <FeedSortDrawer key="sort-drawer" label={SORTS[sort].label}>
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

  // The active-filter bar. Only built when something is actually filtering — an
  // always-present empty bar would be chrome that teaches nothing.
  const filterBar = hasFilter ? (
    <div
      key="filter-bar"
      className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/40 p-2.5"
    >
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

  /*
    Handed to FeedList rather than rendered after it: once infinite scroll has
    appended a page, these links would navigate away from rows already on
    screen, so FeedList drops them at that point. They stay for anyone whose JS
    never ran, and for anyone who wants a page in their history.
  */
  const pagination = (
    /*
      The root element carries a key of its own. This element crosses into a
      Client Component as a prop, and serialization drops the marker JSX puts
      on statically written children — so React re-checks it as if it were an
      entry in a dynamic list where FeedList renders it. The halves below are
      keyed for the same reason.
    */
    <div key="pagination" className="mt-8 flex items-center justify-between">
      {page > 1 ? (
        <Button
          key="back"
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full"
        >
          <Link href={hrefFor({ page: page - 1 })}>Back</Link>
        </Button>
      ) : (
        <span key="back" />
      )}
      {entries.length === PAGE_SIZE ? (
        <Button
          key="next"
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full"
        >
          <Link href={hrefFor({ page: page + 1 })}>
            Slot {firstSlot + PAGE_SIZE} onward
          </Link>
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header
        username={session ? (session.user.username ?? session.user.name) : null}
      />

      <FeedBrowseProvider>
        <FeedBrowseSidebar filtered={hasFilter}>{directory}</FeedBrowseSidebar>

        <main className="min-w-0">
          <div className="mx-auto max-w-[850px] px-4 py-8 sm:px-6 sm:py-10">
            <div className="animate-card-in">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h1 className="font-display text-xl font-bold tracking-[-0.01em]">
                  The rundown
                </h1>
                <Button asChild size="sm" className="rounded-full">
                  <Link href={session === null ? "/sign-in" : "/"}>
                    <PlusIcon aria-hidden />
                    Create &amp; share a list
                  </Link>
                </Button>
              </div>

              <div>
                <div className="min-w-0">
                  {entries.length === 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                        <div className="flex items-center gap-2">
                          {sortDrawer}
                          {sortNav}
                        </div>
                      </div>
                      {filterBar}
                      <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                          <CompassIcon
                            className="size-6 text-muted-foreground"
                            aria-hidden
                          />
                        </div>
                        <h2 className="mt-4 font-display text-lg font-bold">
                          {hasFilter
                            ? "Nothing matches that yet"
                            : "The rundown is empty"}
                        </h2>
                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                          {hasFilter
                            ? "Publish a list that fits and it opens this corner of the rundown."
                            : "Publish a list and it takes slot 01."}
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                          {hasFilter && (
                            <Button
                              asChild
                              variant="outline"
                              className="rounded-full"
                            >
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
                      {/* Only ever a "Back" here — an empty page still needs the way
                      out of it if the reader paged past the end. */}
                      {pagination}
                    </>
                  ) : (
                    <FeedList
                      /*
                    Remount on any change of sort, filter or page. FeedList
                    accumulates later pages in client state, and that state is
                    only meaningful for the query it was fetched under — keying
                    it here is what discards those pages, rather than an effect
                    inside the component that would clear them a render late.
                  */
                      key={hrefFor({ page })}
                      entries={entries}
                      sortNav={sortNav}
                      sortDrawer={sortDrawer}
                      filterBar={filterBar}
                      pagination={pagination}
                      urlState={urlState}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </FeedBrowseProvider>
    </div>
  );
}
