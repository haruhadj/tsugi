"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, Loader2Icon, PlusIcon, SearchIcon, SparklesIcon, StarIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaCover } from "@/components/MediaCover";
import { MediaTypeChip } from "@/components/MediaTypeChip";
import { SegmentedRadioGroup } from "@/components/SegmentedRadioGroup";
import { cn } from "@/lib/utils";
import { fetchGenres, searchMedia, SEARCH_PAGE_SIZE } from "@/lib/providers";
import type { MediaType, Provider, ProviderGenre, UnifiedMediaResult } from "@/lib/types/media";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

const PROVIDER_LABELS: Record<Provider, string> = {
  anilist: "AniList",
  mal: "MyAnimeList",
};

function otherProvider(provider: Provider): Provider {
  return provider === "anilist" ? "mal" : "anilist";
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; results: UnifiedMediaResult[]; hasMore: boolean; loadingMore: boolean }
  // "reauth_required" is a list-import (Phase 7) reason, never returned by
  // search — included only so the shared ProviderResult type checks.
  | {
      status: "error";
      reason: "rate_limited" | "unavailable" | "not_found" | "timeout" | "reauth_required";
    };

const MEDIA_TYPE_OPTIONS: { value: MediaType; label: string }[] = [
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
];

const PROVIDER_OPTIONS: { value: Provider; label: string }[] = [
  { value: "anilist", label: "AniList" },
  { value: "mal", label: "MAL" },
];

/**
 * The builder's "Add titles" workspace: one panel holding the search field, the
 * source and media-type pickers, and a results list that stays open while the
 * author adds several titles in a row.
 *
 * **`Command` is rendered inline here, not inside a `Popover`.** The prototype
 * drew this as a bare `<input>` over a floating `div` of click handlers; that
 * shape loses the listbox role, the managed active option, and the polite
 * announcement of result counts. `cmdk` keeps all three (D42, ui-rules.md
 * § Accessibility) and looks identical once the panel chrome is around it, so
 * the visual moved and the semantics did not. Do not "restore" the Popover: an
 * overlay that closes on select is the opposite of the multi-add behaviour this
 * panel exists to provide.
 */
export function MediaSearchInput({
  provider,
  mediaType,
  onSelect,
  onSwitchProvider,
  onMediaTypeChange,
  isSelected,
}: {
  provider: Provider;
  mediaType: MediaType;
  onSelect: (result: UnifiedMediaResult) => void;
  onSwitchProvider: (provider: Provider) => void;
  onMediaTypeChange: (mediaType: MediaType) => void;
  /** Whether a result is already in the tray — the row shows "Added" instead of "Add". */
  isSelected: (result: UnifiedMediaResult) => boolean;
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

  const runSearch = (q: string, forProvider: Provider, forMediaType: MediaType, forGenre: string | null) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // Bump the search ID so any in-flight response from an older search is ignored.
    const currentSearchId = ++searchIdRef.current;
    pageRef.current = 1;
    setState({ status: "loading" });
    searchMedia(forProvider, q, forMediaType, controller.signal, fetch, forGenre ?? undefined, 1).then((result) => {
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
    });
  };

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

  // A genre selection only counts while the current provider's list still
  // offers it — deriving this (rather than clearing `genre` in an effect) keeps
  // a switch back to the original provider from losing the choice, and avoids a
  // cascading setState. AniList's list is shared across media types; MAL's ids
  // are not, so a stale pick simply reads as "Any genre" until re-chosen.
  const activeGenre = genre !== null && genres.some((g) => g.id === genre) ? genre : null;

  // A search runs on a typed title OR a chosen genre — genre alone is browse.
  const shouldSearch = query.length >= MIN_QUERY_LENGTH || activeGenre !== null;

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

  const handleSwitchOffer = () => {
    const next = otherProvider(provider);
    onSwitchProvider(next);
    // The genre token belongs to the old provider's vocabulary; drop it rather
    // than send an AniList name to MAL (or vice versa).
    setGenre(null);
    runSearch(query, next, mediaType, null);
  };

  /*
    Deliberately does *not* clear the query or collapse the list. The whole point
    of the panel shape is that adding a title leaves the results where they are,
    so a run of "Add, Add, Add" needs one search rather than three.
  */
  const handleSelect = (result: UnifiedMediaResult) => {
    onSelect(result);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary"
            aria-hidden="true"
          >
            <PlusIcon className="size-4" />
          </span>
          <div>
            <h2 className="font-mono text-[0.65rem] font-semibold tracking-[0.24em] text-foreground uppercase">
              Add titles
            </h2>
            <p className="text-xs text-muted-foreground">
              Search {PROVIDER_LABELS[provider]} and add as many as you like.
            </p>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-success/30 bg-success/15 px-2.5 py-1 font-mono text-[10px] text-success sm:inline-flex">
          <SparklesIcon className="size-3" aria-hidden="true" />
          Live search
        </span>
      </div>

      <Command
        shouldFilter={false}
        className="overflow-visible bg-transparent"
        // cmdk binds arrow keys and Enter at the Command root. Without this the
        // radio groups below would be navigated by cmdk's list handler instead
        // of Radix's own roving tabindex.
        loop
      >
        <div className="flex flex-col gap-2 rounded-xl border border-input bg-background p-1.5 focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-ring/50 sm:flex-row sm:items-center">
          <div className="relative flex flex-1 items-center">
            <SearchIcon
              className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            {/*
              A plain input rather than CommandInput: cmdk's own input renders
              its own bordered wrapper, and this one has to sit inside a bar it
              shares with two radio groups. `cmdk-input` marks it as the list's
              controller so keyboard navigation still reaches the results.
            */}
            <input
              ref={inputRef}
              cmdk-input=""
              autoFocus
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search anime or manga…"
              aria-label="Search for a title"
              className="min-h-11 w-full bg-transparent pr-12 pl-9 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="absolute right-3 flex items-center">
              {effectiveState.status === "loading" ? (
                <Loader2Icon
                  className="size-4 animate-spin text-primary"
                  aria-hidden="true"
                />
              ) : (
                <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
                  /
                </kbd>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {genres.length > 0 && (
              <Select
                value={activeGenre ?? "__all__"}
                onValueChange={(v) => setGenre(v === "__all__" ? null : v)}
              >
                <SelectTrigger
                  className="h-9 w-36"
                  aria-label="Browse by genre"
                >
                  <SelectValue placeholder="Any genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Any genre</SelectItem>
                  {genres.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <SegmentedRadioGroup
              label="Search source"
              value={provider}
              options={PROVIDER_OPTIONS}
              onChange={onSwitchProvider}
            />
            <SegmentedRadioGroup
              label="Media type"
              value={mediaType}
              options={MEDIA_TYPE_OPTIONS}
              onChange={onMediaTypeChange}
            />
          </div>
        </div>

        {effectiveState.status !== "idle" && (
          <div className="mt-2 overflow-hidden rounded-xl border border-border bg-popover">
            <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3 py-2">
              <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                {query
                  ? `Results for “${query}”`
                  : `Browsing ${genres.find((g) => g.id === activeGenre)?.label ?? "genre"}`}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {PROVIDER_LABELS[provider]}
              </span>
            </div>

            <CommandList className="max-h-96" onScroll={handleResultsScroll}>
              {effectiveState.status === "results" && effectiveState.results.length === 0 && (
                <CommandEmpty>No results on {PROVIDER_LABELS[provider]}.</CommandEmpty>
              )}
              {effectiveState.status === "results" && effectiveState.results.length > 0 && (
                <CommandGroup>
                  {effectiveState.results.map((result) => {
                    const added = isSelected(result);
                    return (
                      <CommandItem
                        key={`${result.provider}-${result.externalId}`}
                        value={`${result.provider}-${result.externalId}`}
                        onSelect={() => handleSelect(result)}
                        disabled={added}
                        className="flex-col items-stretch gap-0 overflow-hidden rounded-xl border border-border bg-card p-0"
                      >
                        <div className="relative aspect-[2/3] w-full">
                          <MediaCover
                            src={result.coverImage}
                            title=""
                            width={200}
                            height={300}
                            className="size-full object-cover"
                          />
                          {result.averageScore !== null && (
                            <span className="absolute bottom-1 right-1 z-10 inline-flex items-center gap-1 rounded border border-highlight/30 bg-highlight/15 px-1.5 py-0.5 font-mono text-[10px] text-highlight">
                              <StarIcon className="size-2.5" aria-hidden="true" />
                              {/*
                                Named for screen readers because this chip sits beside the
                                author's own ScoreBadge elsewhere in the builder and looks
                                like one — it is the provider's community aggregate, never
                                the user's rating (D28).
                              */}
                              <span className="sr-only">
                                {PROVIDER_LABELS[result.provider]} community score{" "}
                              </span>
                              {result.averageScore}%
                            </span>
                          )}
                          <span
                            className={cn(
                              "absolute top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full",
                              added
                                ? "bg-success/90 text-success-foreground"
                                : "bg-primary/90 text-primary-foreground",
                            )}
                            aria-label={added ? "Added" : "Add to list"}
                          >
                            {added ? (
                              <CheckIcon className="size-4" aria-hidden="true" />
                            ) : (
                              <PlusIcon className="size-4" aria-hidden="true" />
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 p-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <MediaTypeChip mediaType={result.mediaType} />
                            {result.year !== null && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {result.year}
                              </span>
                            )}
                          </div>
                          <span className="line-clamp-2 text-xs font-bold text-foreground">
                            {result.title}
                          </span>
                          {result.genres.length > 0 && (
                            <span className="truncate font-mono text-[10px] text-muted-foreground">
                              {result.genres.slice(0, 2).join(" · ")}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                  {effectiveState.loadingMore && (
                    <div className="col-span-full flex items-center justify-center py-3">
                      <Loader2Icon
                        className="size-4 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </CommandGroup>
              )}
              {effectiveState.status === "error" && effectiveState.reason === "rate_limited" && (
                <p className="px-3 py-4 text-sm text-muted-foreground" role="status">
                  Searching too fast, one moment.
                </p>
              )}
              {effectiveState.status === "error" &&
                (effectiveState.reason === "unavailable" ||
                  effectiveState.reason === "timeout") && (
                  <div className="flex flex-col gap-2 px-3 py-4 text-sm" role="status">
                    <p className="text-muted-foreground">
                      {PROVIDER_LABELS[provider]} isn&apos;t responding right now.
                    </p>
                    <button
                      type="button"
                      className="min-h-11 self-start text-sm font-medium text-primary underline underline-offset-4"
                      onClick={handleSwitchOffer}
                    >
                      Search {PROVIDER_LABELS[otherProvider(provider)]} instead
                    </button>
                  </div>
                )}
            </CommandList>
          </div>
        )}
      </Command>
    </section>
  );
}
