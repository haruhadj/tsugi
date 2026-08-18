"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, Loader2Icon, PlusIcon, SearchIcon, SparklesIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MediaCover } from "@/components/MediaCover";
import { SegmentedRadioGroup } from "@/components/SegmentedRadioGroup";
import { cn } from "@/lib/utils";
import { searchMedia } from "@/lib/providers";
import type { MediaType, Provider, UnifiedMediaResult } from "@/lib/types/media";

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
  | { status: "results"; results: UnifiedMediaResult[] }
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
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = (q: string, forProvider: Provider, forMediaType: MediaType) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });
    searchMedia(forProvider, q, forMediaType, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setState({ status: "results", results: result.data });
      } else {
        setState({ status: "error", reason: result.reason });
      }
    });
  };

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      return;
    }
    const timer = setTimeout(() => runSearch(query, provider, mediaType), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, provider, mediaType]);

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

  const effectiveState: SearchState = query.length < MIN_QUERY_LENGTH ? { status: "idle" } : state;

  const handleSwitchOffer = () => {
    const next = otherProvider(provider);
    onSwitchProvider(next);
    runSearch(query, next, mediaType);
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

          <div className="flex flex-wrap items-center gap-1.5">
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
                Results for “{query}”
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {PROVIDER_LABELS[provider]}
              </span>
            </div>

            <CommandList className="max-h-96">
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
                        className="items-start gap-3 py-2.5"
                      >
                        <MediaCover
                          src={result.coverImage}
                          title=""
                          width={40}
                          height={56}
                          className="shrink-0 rounded-md"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                              {result.mediaType}
                            </span>
                            {result.year !== null && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {result.year}
                              </span>
                            )}
                            {result.averageScore !== null && (
                              <span className="rounded border border-highlight/30 bg-highlight/15 px-1.5 py-0.5 font-mono text-[10px] text-highlight">
                                {result.averageScore}%
                              </span>
                            )}
                          </div>
                          <span className="truncate text-sm font-bold text-foreground">
                            {result.title}
                          </span>
                          {result.genres.length > 0 && (
                            <span className="truncate font-mono text-[11px] text-muted-foreground">
                              {result.genres.slice(0, 3).join(" · ")}
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold",
                            added
                              ? "border-success/40 bg-success/15 text-success"
                              : "border-primary/40 bg-primary/15 text-primary",
                          )}
                        >
                          {added ? (
                            <>
                              <CheckIcon className="size-3.5" aria-hidden="true" />
                              Added
                            </>
                          ) : (
                            <>
                              <PlusIcon className="size-3.5" aria-hidden="true" />
                              Add
                            </>
                          )}
                        </span>
                      </CommandItem>
                    );
                  })}
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
