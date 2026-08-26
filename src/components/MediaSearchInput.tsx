"use client";

import { Loader2Icon, PlusIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { Command } from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedRadioGroup } from "@/components/SegmentedRadioGroup";
import { otherProvider, PROVIDER_LABELS } from "@/components/media-search/labels";
import { SearchResultsList } from "@/components/media-search/SearchResultsList";
import { useMediaSearch } from "@/components/media-search/useMediaSearch";
import type { MediaType, Provider, UnifiedMediaResult } from "@/lib/types/media";

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
  onRemove,
  onSwitchProvider,
  onMediaTypeChange,
  isSelected,
}: {
  provider: Provider;
  mediaType: MediaType;
  onSelect: (result: UnifiedMediaResult) => void;
  /** Pressing an already-added result's cover asks to take it back out of the tray. */
  onRemove: (result: UnifiedMediaResult) => void;
  onSwitchProvider: (provider: Provider) => void;
  onMediaTypeChange: (mediaType: MediaType) => void;
  /** Whether a result is already in the tray — the row shows "Added" instead of "Add". */
  isSelected: (result: UnifiedMediaResult) => boolean;
}) {
  const {
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
  } = useMediaSearch({ provider, mediaType });

  const handleSwitchOffer = () => {
    const next = otherProvider(provider);
    onSwitchProvider(next);
    switchSearch(next);
  };

  /*
    An already-added result stays clickable rather than becoming `disabled` —
    pressing its cover again is how a title comes back out mid-search. Neither
    branch clears the query or collapses the list: the whole point of the panel
    shape is that adding a title leaves the results where they are, so a run of
    "Add, Add, Add" needs one search rather than three.
  */
  const handleItemSelect = (result: UnifiedMediaResult) => {
    if (isSelected(result)) {
      onRemove(result);
    } else {
      onSelect(result);
    }
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

        <SearchResultsList
          state={effectiveState}
          provider={provider}
          query={query}
          genres={genres}
          activeGenre={activeGenre}
          isSelected={isSelected}
          onItemSelect={handleItemSelect}
          onSwitchOffer={handleSwitchOffer}
          onScroll={handleResultsScroll}
        />
      </Command>
    </section>
  );
}
