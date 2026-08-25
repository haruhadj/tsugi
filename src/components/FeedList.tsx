"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  LayoutGridIcon,
  LayoutListIcon,
  ListOrderedIcon,
  Loader2Icon,
  RefreshCwIcon,
  Rows3Icon,
  Share2Icon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ShareModal } from "@/components/ShareModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VoteButtons } from "@/components/VoteButtons";
import type { FeedCover, FeedEntry } from "@/server/services/lists";
import {
  FEED_PAGE_SIZE,
  buildFeedQuery,
  type FeedUrlState,
} from "@/lib/feed-params";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/format";
import { cn } from "@/lib/utils";

const DENSITIES = [
  { id: "stream", label: "Stream", icon: LayoutListIcon },
  { id: "classic", label: "Compact", icon: Rows3Icon },
  { id: "grid", label: "Grid", icon: LayoutGridIcon },
] as const;

type Density = (typeof DENSITIES)[number]["id"];

/** How far past the last card the sentinel starts fetching. Roughly a screen. */
const PREFETCH_MARGIN = "600px";

/** Drag distance, in CSS pixels, that arms a refresh. */
const PULL_THRESHOLD = 64;

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
          "sticky top-16 z-30 -mx-4 border-b border-border bg-background/90 px-4 py-2 backdrop-blur-xl",
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

type FeedStatus = "idle" | "loading" | "error" | "done";

/**
 * Appends later pages of the rundown as the reader reaches the end of the
 * current one.
 *
 * The server still renders page 1 — that is what keeps `/feed` shareable and
 * indexable, and it means this never runs at all for the majority of visits
 * that read the top of the feed and leave.
 *
 * Nothing here resets when the sort or filter changes, because it does not have
 * to: `FeedPage` gives `FeedList` a `key` derived from the query, so a new
 * filter remounts the whole component and every page appended under the old one
 * goes with it. Resetting this in an effect instead would leave one render in
 * which the new rundown is displayed with the old rundown's pages still stacked
 * underneath it.
 */
function useInfiniteFeed(entries: FeedEntry[], urlState: FeedUrlState) {
  const [appended, setAppended] = useState<FeedEntry[]>([]);
  const [status, setStatus] = useState<FeedStatus>(
    // Page 1 came back short, so there is no page 2 to ask for and the observer
    // should never fire even once.
    entries.length < FEED_PAGE_SIZE ? "done" : "idle",
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const nextPage = useRef(urlState.page + 1);
  // Guards the fetch, not the observer: the sentinel can intersect repeatedly
  // while one request is still open (a short list leaves it on screen), and
  // without this each intersection would append the same page again.
  const inFlight = useRef(false);

  // `urlState` is a prop from the server component, so its identity survives
  // every state update this hook makes and only changes on navigation — which
  // is exactly when the observer *should* be re-armed. Depending on it directly
  // is therefore stable in the way the observer effect below needs.
  const loadMore = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("loading");

    try {
      const res = await fetch(
        `/api/feed?${buildFeedQuery(urlState, { page: nextPage.current })}`,
      );
      if (!res.ok) throw new Error(String(res.status));

      // Typed as FeedEntry because it is the same row, but note that the dates
      // inside it are ISO strings here rather than Date objects — JSON has no
      // date type. `formatRelativeTime` takes both for exactly this reason.
      const { entries: more } = (await res.json()) as { entries: FeedEntry[] };

      if (more.length > 0) {
        setAppended((current) => [...current, ...more]);
        nextPage.current += 1;
      }
      setStatus(more.length < FEED_PAGE_SIZE ? "done" : "idle");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [urlState]);

  useEffect(() => {
    const node = sentinelRef.current;
    // "error" stops the observer on purpose: the retry button is the way back,
    // so a failing endpoint is asked once and then left alone rather than
    // re-requested on every pixel of scroll.
    if (!node || status === "done" || status === "error") return;

    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) void loadMore();
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [status, loadMore]);

  const retry = useCallback(() => {
    setStatus("idle");
    void loadMore();
  }, [loadMore]);

  return { appended, status, sentinelRef, retry };
}

/**
 * Drag down at the top of the feed to reload it.
 *
 * Listens on `window` rather than on a container because the scroll being
 * overscrolled is the document's. The trade this makes is recorded in
 * `globals.css`: `overscroll-behavior-y: contain` has to be set on the body for
 * the browser's own pull-to-refresh not to fire alongside this one, which means
 * the native gesture is gone and this is now the only one.
 */
function usePullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  // `router.refresh()` returns nothing to await — it resolves by re-rendering
  // the server component. Wrapping it in a transition is how its progress
  // becomes readable: `isPending` stays true until the new tree is committed,
  // which is precisely "the refresh is still running".
  const [refreshing, startRefresh] = useTransition();
  const pullRef = useRef(0);

  useEffect(() => {
    // The drag readout is decoration; the refresh is the function. Under
    // reduced motion the gesture still works, it just does not animate, so the
    // listeners stay attached and only the indicator's height is pinned at 0.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let startY: number | null = null;

    function begin(event: TouchEvent) {
      startY = window.scrollY <= 0 ? (event.touches[0]?.clientY ?? null) : null;
    }

    function move(event: TouchEvent) {
      if (startY === null) return;

      const current = event.touches[0]?.clientY;
      if (current === undefined) return;

      const delta = current - startY;
      // Scrolling up, or the page has scrolled away from the top mid-gesture:
      // this was a scroll, not a pull. Release it back to the browser.
      if (delta <= 0 || window.scrollY > 0) {
        startY = null;
        pullRef.current = 0;
        setPull(0);
        return;
      }

      // Only safe because the document is already at scrollTop 0 and the drag
      // is downward — there is no scrolling this cancels, only the rubber-band.
      event.preventDefault();
      // Damped, so the indicator trails the thumb the way a physical pull does
      // and the threshold takes a deliberate drag rather than a flick.
      pullRef.current = Math.min(delta * 0.5, PULL_THRESHOLD * 1.5);
      setPull(reduced ? 0 : pullRef.current);
    }

    function end() {
      if (startY === null) return;
      startY = null;

      if (pullRef.current >= PULL_THRESHOLD) {
        startRefresh(() => router.refresh());
      }
      pullRef.current = 0;
      setPull(0);
    }

    // `move` must be non-passive to be allowed to preventDefault, which is why
    // these are attached by hand instead of as React props — React registers
    // touch handlers passively.
    window.addEventListener("touchstart", begin, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", end, { passive: true });

    return () => {
      window.removeEventListener("touchstart", begin);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, [router, startRefresh]);

  return { pull, refreshing };
}

/**
 * The card action bar's shape: a filled pill with a 44px target on touch
 * (ui-rules.md § Responsive), thinning to the quiet text button it used to be
 * from `md` up, where the row sits inside a bordered card and three more
 * outlined pills would be one border too many.
 */
const ACTION_PILL = cn(
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 text-xs font-medium",
  "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
  "md:min-h-0 md:border-transparent md:bg-transparent md:px-2 md:py-1",
);

function CopyLinkButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/r/${slug}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied outright; the link is still on screen and
      // selectable, so there is nothing to recover from and nothing to announce.
    }
  }

  return (
    <button type="button" onClick={copy} className={cn(ACTION_PILL, className)}>
      {copied ? (
        <CheckIcon className="size-3.5 text-success" aria-hidden />
      ) : (
        <CopyIcon className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}

/**
 * The same modal the artifact page's `ShareListButton` opens, minus the card
 * tab — a feed row has the URL but not the resolved titles `SocialCardInput`
 * needs, and `ShareModal` already treats `card` as optional for exactly that
 * case (the builder opens it in the same half-known state).
 */
function ShareRowButton({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const url =
    typeof window === "undefined"
      ? `/r/${slug}`
      : `${window.location.origin}/r/${slug}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(ACTION_PILL, className)}
      >
        <Share2Icon className="size-3.5" aria-hidden />
        Share
      </button>
      <ShareModal open={open} onOpenChange={setOpen} url={url} text={name} />
    </>
  );
}

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
function Filmstrip({ covers }: { covers: FeedCover[] }) {
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

/** Fewer than three genres describes a theme; three or more describes a range. */
const MULTI_GENRE_THRESHOLD = 3;

function MultiGenreBadge({ genres }: { genres: string[] }) {
  if (genres.length < MULTI_GENRE_THRESHOLD) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-highlight/30 bg-highlight/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-highlight">
      <SparklesIcon className="size-3" aria-hidden />
      Multi-genre
    </span>
  );
}

/**
 * The link-overlay pattern: the title's `<Link>` grows a full-card pseudo-element
 * so the whole row is a click target, while staying a real anchor — keyboard
 * focus, middle-click and open-in-new-tab all keep working. A `div` with an
 * `onClick` would look identical and silently lose all three (ui-rules.md:
 * never strip a primitive's behaviour to match a mockup).
 *
 * Everything interactive that sits *over* the overlay needs `relative z-10`, or
 * the overlay swallows it — that is what `OVER_LINK_OVERLAY` marks.
 */
const LINK_OVERLAY = "after:absolute after:inset-0 after:content-['']";
const OVER_LINK_OVERLAY = "relative z-10";

function CategoryChip({ name }: { name: string }) {
  return (
    <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
      {name}
    </span>
  );
}

/**
 * The author's handle (D49). Renders nothing at all when there isn't one —
 * accounts that predate mandatory handles are gated at next sign-in rather than
 * backfilled, so until then their published lists simply go unattributed rather
 * than being signed with a name the person never chose.
 */
function AuthorTag({ username }: { username: string | null }) {
  if (!username) return null;
  return (
    <span className="font-mono text-[11px] text-muted-foreground">
      u/{username}
    </span>
  );
}

/** Genre chips link back into the feed, so the rundown filters itself. */
function GenreChips({ genres }: { genres: string[] }) {
  if (genres.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1">
      {genres.map((genre) => (
        <li key={genre}>
          <Link
            href={`/feed?genre=${encodeURIComponent(genre)}`}
            className="inline-block rounded border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-highlight/50 hover:text-highlight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            #{genre}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Meta({ entry }: { entry: FeedEntry }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <EyeIcon className="size-3" aria-hidden />
        {entry.views}
      </span>
      <span className="inline-flex items-center gap-1">
        <ListOrderedIcon className="size-3" aria-hidden />
        {entry.itemCount} {entry.itemCount === 1 ? "title" : "titles"}
      </span>
    </div>
  );
}

/**
 * The rundown's default row — the same shape at every width.
 *
 * Used to shed the chip row, caption, genre links and filmstrip below `md`
 * for a compact Reddit-style thumbnail card, but that made the phone and
 * desktop feeds read as two different products. It is one card now: the
 * `md:` variants below only ever adjust spacing, borders and text size, never
 * which content renders — a phone pays a few more image requests for the
 * filmstrip, same as desktop does, `next/image` lazy-loading the ones still
 * off screen.
 *
 * No link overlay: with the genre chips, filmstrip and copy button live at
 * every width, a full-card overlay would swallow all three the way the old
 * compact card's doc comment warned about. The title's own `Link` and the
 * explicit "Open" pill are the click targets everywhere.
 */
function StreamCard({ entry }: { entry: FeedEntry }) {
  const published = entry.publishedAt ?? entry.createdAt;
  const age = formatRelativeTime(published);

  return (
    <li
      className={cn(
        "relative flex flex-col gap-2 border-b border-border px-4 py-3 transition-colors",
        "md:gap-1 md:rounded-md md:border md:bg-card/40 md:p-2.5 md:hover:border-input",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip name={entry.category} />
        <MultiGenreBadge genres={entry.genres} />
        <AuthorTag username={entry.authorUsername} />
        {age && (
          <time
            dateTime={toDateTimeAttribute(published)}
            className="font-mono text-[11px] text-muted-foreground"
          >
            {age}
          </time>
        )}
      </div>

      <div className="min-w-0">
        <Link
          href={`/r/${entry.slug}`}
          className="min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <h2 className="line-clamp-2 font-display text-base leading-tight font-bold tracking-[-0.01em] text-foreground md:text-[13px]">
            {entry.name}
          </h2>
        </Link>
        {entry.caption && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground md:mt-0.5">
            {entry.caption}
          </p>
        )}
        <div className="mt-1.5 md:mt-1">
          <Meta entry={entry} />
        </div>
      </div>

      <GenreChips genres={entry.genres} />

      <Filmstrip covers={entry.covers} />

      <div className="flex flex-wrap items-center gap-2 md:justify-start md:gap-1.5">
        <VoteButtons
          slug={entry.slug}
          initialScore={entry.score}
          initialDirection={entry.myDirection}
          size="touch"
        />
        <Link
          href={`/r/${entry.slug}`}
          className={cn(ACTION_PILL, "text-primary")}
        >
          Open
          <ArrowRightIcon className="size-3.5" aria-hidden />
        </Link>
        <CopyLinkButton slug={entry.slug} />
        <ShareRowButton slug={entry.slug} name={entry.name} />
      </div>
    </li>
  );
}

function CompactRow({ entry }: { entry: FeedEntry }) {
  return (
    <li className="relative flex items-center gap-4 border-b border-border px-4 py-3 transition-colors md:rounded-xl md:border md:bg-card/40 md:hover:border-input">
      <MediaCover
        src={entry.covers[0]?.coverImage ?? null}
        title={entry.name}
        width={36}
        height={54}
        className="shrink-0 rounded-md"
      />

      <div className="min-w-0 flex-1">
        <Link
          href={`/r/${entry.slug}`}
          className={cn(
            "rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            LINK_OVERLAY,
          )}
        >
          <h2 className="truncate text-sm leading-tight font-semibold text-foreground">
            {entry.name}
          </h2>
        </Link>
        <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span className="truncate">{entry.category}</span>
          {entry.authorUsername && (
            <span className="truncate">u/{entry.authorUsername}</span>
          )}
          <span className="hidden md:inline">{entry.itemCount} titles</span>
          <span className="hidden md:inline">{entry.views} views</span>
        </div>
        <div className={cn("mt-2", OVER_LINK_OVERLAY)}>
          <GenreChips genres={entry.genres} />
        </div>
      </div>

      <VoteButtons
        slug={entry.slug}
        initialScore={entry.score}
        initialDirection={entry.myDirection}
        size="touch"
        className={cn("shrink-0", OVER_LINK_OVERLAY)}
      />
    </li>
  );
}

function GridCard({ entry }: { entry: FeedEntry }) {
  return (
    <li className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-input">
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip name={entry.category} />
        <MultiGenreBadge genres={entry.genres} />
      </div>

      <Link
        href={`/r/${entry.slug}`}
        className={cn(
          "rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          LINK_OVERLAY,
        )}
      >
        <h2 className="line-clamp-2 font-display leading-tight font-bold tracking-[-0.01em] text-foreground">
          {entry.name}
        </h2>
      </Link>

      <AuthorTag username={entry.authorUsername} />

      {/*
        The covers overlap into a fanned stack — a deliberately decorative
        treatment, unlike the stream's filmstrip, so it keeps its aria-hidden:
        overlapping art cannot be read in order and the titles are one click away.
        Each is `flex-1` so they share the card's width evenly and grow to fill
        it; the negative margin overlaps them, and `ring-card` draws the seam
        between. The first stays flush with the card's left padding, and the
        flex growth carries the last one out to the right edge, so there is no
        dead space beside the stack whatever the card's width. `basis-0` keeps
        the split even regardless of the covers' intrinsic size.
      */}
      {entry.covers.length > 0 && (
        <ul aria-hidden className="flex">
          {entry.covers.map((cover, index) => (
            <li
              key={`${cover.title}-${index}`}
              className={cn("min-w-0 flex-1 basis-0", index > 0 && "-ml-4")}
              // Later covers sit on top of earlier ones, so the fan reads
              // left-over-right like a spread hand rather than the reverse.
              style={{ zIndex: index }}
            >
              <MediaCover
                src={cover.coverImage}
                title=""
                width={56}
                height={84}
                fluid
                className="rounded-md ring-2 ring-card"
              />
            </li>
          ))}
        </ul>
      )}

      <div className={OVER_LINK_OVERLAY}>
        <GenreChips genres={entry.genres} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <Meta entry={entry} />
        <VoteButtons
          slug={entry.slug}
          initialScore={entry.score}
          initialDirection={entry.myDirection}
          size="touch"
          className={OVER_LINK_OVERLAY}
        />
      </div>
    </li>
  );
}
