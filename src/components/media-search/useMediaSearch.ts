import { useEffect, useRef, useState } from "react";
import { fetchGenres, searchMedia, SEARCH_PAGE_SIZE } from "@/lib/providers";
import type { MediaType, Provider, ProviderGenre, UnifiedMediaResult } from "@/lib/types/media";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; results: UnifiedMediaResult[]; hasMore: boolean; loadingMore: boolean }
  // "reauth_required" is a list-import (Phase 7) reason, never returned by
  // search — included only so the shared ProviderResult type checks.
  | {
      status: "error";
      reason: "rate_limited" | "unavailable" | "not_found" | "timeout" | "reauth_required";
    };

/**
 * The search/browse state behind `MediaSearchInput`: the debounced query, the
 * provider's genre vocabulary, and the paged results list, kept together since
 * a provider or media-type switch has to reset all three in step.
 */
export function useMediaSearch({
  provider,
  mediaType,
}: {
  provider: Provider;
  mediaType: MediaType;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  // Genre browse (D-genre-browse). `genre` is the provider's own browse token
  // (AniList name / MAL id) so it can be passed straight to searchMedia; the
  // label for display rides alongside in `genres`.
  const [genre, setGenre] = useState<string | null>(null);
  const [genres, setGenres] = useState<ProviderGenre[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Genre lists are re-usable across a session and spend the same 30/min budget
  // (D3) — cache per provider:mediaType, exactly as MyListPicker caches lists.
  const genreCacheRef = useRef<Map<string, ProviderGenre[]>>(new Map());
  // Incremented on every search to track which request is current.
  // Prevents stale responses from a previous query overwriting newer results.
  const searchIdRef = useRef(0);
  // The page a load-more should fetch next, for the currently active search.
  // Reset to 1 whenever a fresh search starts (query/provider/media/genre change).
  const pageRef = useRef(1);

  const runSearch = (
    q: string,
    forProvider: Provider,
    forMediaType: MediaType,
    forGenre: string | null,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // Bump the search ID so any in-flight response from an older search is ignored.
    const currentSearchId = ++searchIdRef.current;
    pageRef.current = 1;
    setState({ status: "loading" });
    searchMedia(forProvider, q, forMediaType, controller.signal, fetch, forGenre ?? undefined, 1).then(
      (result) => {
        // Ignore responses from stale searches (e.g. user kept typing, or switched provider/media).
        if (currentSearchId !== searchIdRef.current) return;
        if (controller.signal.aborted) return;
        if (result.ok) {
          setState({
            status: "results",
            results: result.data,
            // A full page suggests there may be more; a short one means we hit
            // the end. Not exact (a total that's an exact multiple of the page
            // size costs one extra empty fetch), but no provider here exposes a
            // real total count to check against instead.
            hasMore: result.data.length === SEARCH_PAGE_SIZE,
            loadingMore: false,
          });
        } else {
          setState({ status: "error", reason: result.reason });
        }
      },
    );
  };

  // A genre selection only counts while the current provider's list still
  // offers it — deriving this (rather than clearing `genre` in an effect) keeps
  // a switch back to the original provider from losing the choice, and avoids a
  // cascading setState. AniList's list is shared across media types; MAL's ids
  // are not, so a stale pick simply reads as "Any genre" until re-chosen.
  const activeGenre = genre !== null && genres.some((g) => g.id === genre) ? genre : null;

  // A search runs on a typed title OR a chosen genre — genre alone is browse.
  const shouldSearch = query.length >= MIN_QUERY_LENGTH || activeGenre !== null;

  /*
    Fires when the results panel is scrolled near its bottom. Reuses the same
    AbortController and searchId as the search currently on screen, so a fresh
    keystroke (which aborts that controller and bumps searchIdRef) also cancels
    any load-more in flight for the search it's replacing.
  */
  const loadMore = () => {
    if (state.status !== "results" || !state.hasMore || state.loadingMore) return;
    const controller = abortRef.current;
    if (!controller) return;
    const currentSearchId = searchIdRef.current;
    const nextPage = pageRef.current + 1;
    setState((s) => (s.status === "results" ? { ...s, loadingMore: true } : s));
    searchMedia(provider, query, mediaType, controller.signal, fetch, activeGenre ?? undefined, nextPage).then(
      (result) => {
        if (currentSearchId !== searchIdRef.current) return;
        if (controller.signal.aborted) return;
        if (result.ok) {
          pageRef.current = nextPage;
          setState((s) =>
            s.status === "results"
              ? {
                  status: "results",
                  results: [...s.results, ...result.data],
                  hasMore: result.data.length === SEARCH_PAGE_SIZE,
                  loadingMore: false,
                }
              : s,
          );
        } else {
          // Leave the results already on screen in place; just stop trying to
          // page further rather than replacing a working list with an error.
          setState((s) => (s.status === "results" ? { ...s, loadingMore: false, hasMore: false } : s));
        }
      },
    );
  };

  const handleResultsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
      loadMore();
    }
  };

  useEffect(() => {
    if (!shouldSearch) {
      // Cancel any in-flight request; `effectiveState` already renders idle, so
      // no setState is needed here.
      abortRef.current?.abort();
      return;
    }
    const timer = setTimeout(() => runSearch(query, provider, mediaType, activeGenre), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, provider, mediaType, activeGenre, shouldSearch]);

  // Load the provider's genre vocabulary; changing provider (or, for MAL, media
  // type) reloads it.
  useEffect(() => {
    const key = `${provider}:${mediaType}`;
    const cached = genreCacheRef.current.get(key);
    if (cached) {
      setGenres(cached);
      return;
    }
    const controller = new AbortController();
    fetchGenres(provider, mediaType, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        genreCacheRef.current.set(key, result.data);
        setGenres(result.data);
      }
    });
    return () => controller.abort();
  }, [provider, mediaType]);

  /*
    "/" focuses the search box, the way the prototype does — but only when the
    caret is not already in a field, or typing a slash into a comment would
    teleport focus out of it. Cmd/Ctrl+K has no such conflict.
  */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const effectiveState: SearchState = shouldSearch ? state : { status: "idle" };

  const switchSearch = (nextProvider: Provider) => {
    // The genre token belongs to the old provider's vocabulary; drop it rather
    // than send an AniList name to MAL (or vice versa).
    setGenre(null);
    runSearch(query, nextProvider, mediaType, null);
  };

  return {
    query,
    setQuery,
    genre,
    setGenre,
    genres,
    activeGenre,
    effectiveState,
    inputRef,
    handleResultsScroll,
    switchSearch,
  };
}
