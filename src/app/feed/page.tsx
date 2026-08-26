import {
  FeedBrowseMobileTrigger,
  FeedBrowseProvider,
  FeedBrowseSidebar,
} from "@/components/FeedBrowseDrawer";
import { FeedDirectory } from "@/components/feed/FeedDirectory";
import { FeedEmptyState } from "@/components/feed/FeedEmptyState";
import { FeedFilterBar } from "@/components/feed/FeedFilterBar";
import { FeedPagination } from "@/components/feed/FeedPagination";
import { FeedSortDrawerNav } from "@/components/feed/FeedSortDrawerNav";
import { FeedSortNav } from "@/components/feed/FeedSortNav";
import { isFeedSort } from "@/components/feed/sortOptions";
import { FeedList } from "@/components/FeedList";
import { Header } from "@/components/Header";
import { getServerSession } from "@/lib/auth";
import { isListCategory } from "@/lib/categories";
import {
  FEED_PAGE_SIZE,
  buildFeedHref,
  normalizeFeedQuery,
  normalizeMediaType,
  type FeedUrlState,
} from "@/lib/feed-params";
import {
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

  // The rundown's directory, rendered once and reused in both the desktop
  // sidebar (`FeedBrowseSidebar`) and the phone Browse drawer
  // (`FeedBrowseMobileTrigger`).
  const directory = (
    <FeedDirectory
      urlState={urlState}
      mediaTypeCounts={mediaTypeCounts}
      categories={categories}
      genres={genres}
      category={category}
      genre={genre}
      hrefFor={hrefFor}
      totalPublished={totalPublished}
      signedIn={session !== null}
    />
  );

  // The phone form of the directory rail: shares `directory` with
  // `FeedBrowseSidebar`, but opens as a sheet instead of occupying a grid
  // track that a phone has no width to spare for. Handed to `Header` as its
  // `mobileMenu` slot, which is why it renders as a bare hamburger — that
  // slot lives in the top bar beside the wordmark, not this page's own
  // content.
  const browseTrigger = (
    <FeedBrowseMobileTrigger key="browse-trigger" filtered={hasFilter} iconOnly>
      {directory}
    </FeedBrowseMobileTrigger>
  );

  const sortNav = <FeedSortNav key="sort-nav" sort={sort} hrefFor={hrefFor} />;
  const sortDrawer = (
    <FeedSortDrawerNav key="sort-drawer" sort={sort} hrefFor={hrefFor} />
  );

  // The active-filter bar. Only built when something is actually filtering — an
  // always-present empty bar would be chrome that teaches nothing.
  const filterBar = hasFilter ? (
    <FeedFilterBar
      key="filter-bar"
      category={category}
      genre={genre}
      mediaType={mediaType}
      q={q}
      hrefFor={hrefFor}
    />
  ) : null;

  const pagination = (
    <FeedPagination
      key="pagination"
      page={page}
      pageSize={PAGE_SIZE}
      entriesLength={entries.length}
      firstSlot={firstSlot}
      hrefFor={hrefFor}
    />
  );

  return (
    <div className="min-h-screen">
      <Header
        username={session ? (session.user.username ?? session.user.name) : null}
        mobileMenu={browseTrigger}
      />

      <FeedBrowseProvider>
        <FeedBrowseSidebar filtered={hasFilter}>{directory}</FeedBrowseSidebar>

        <main className="min-w-0">
          <div className="mx-auto max-w-[732px] px-4 pt-2 pb-8 sm:px-6 sm:pt-10 sm:pb-10">
            <div className="animate-card-in">
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
                      <FeedEmptyState hasFilter={hasFilter} hrefFor={hrefFor} />
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
