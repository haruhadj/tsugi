import { useCallback, useEffect, useRef, useState } from "react";
import { FEED_PAGE_SIZE, buildFeedQuery, type FeedUrlState } from "@/lib/feed-params";
import type { FeedEntry } from "@/server/services/lists";

/** How far past the last card the sentinel starts fetching. Roughly a screen. */
const PREFETCH_MARGIN = "600px";

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
export function useInfiniteFeed(entries: FeedEntry[], urlState: FeedUrlState) {
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
