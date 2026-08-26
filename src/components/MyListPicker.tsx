"use client";

import { useState } from "react";
import {
  BookOpenIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  TvIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type SortMode } from "@/components/my-list-picker/helpers";
import { ResultGrid } from "@/components/my-list-picker/ResultGrid";
import { StatusFilterBar } from "@/components/my-list-picker/StatusFilterBar";
import { useMyListEntries } from "@/components/my-list-picker/useMyListEntries";
import { useMyListFilters } from "@/components/my-list-picker/useMyListFilters";
import { SegmentedRadioGroup } from "@/components/SegmentedRadioGroup";
import type { ListEntry, MediaType, Provider } from "@/lib/types/media";

const PROVIDER_LABELS: Record<Provider, string> = {
  anilist: "AniList",
  mal: "MyAnimeList",
};

export function MyListPicker({
  provider: initialProvider,
  mediaType: initialMediaType,
  onImport,
  isSelected,
  handle,
}: {
  provider: Provider;
  mediaType: MediaType;
  onImport: (entry: ListEntry) => void;
  isSelected: (entry: ListEntry) => boolean;
  handle?: string | null;
}) {
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType);

  const { state, refreshing, load } = useMyListEntries(provider, mediaType);

  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    genreFilter,
    setGenreFilter,
    sortMode,
    setSortMode,
    allGenres,
    statusCounts,
    filtered,
    addableCount,
  } = useMyListFilters(state, isSelected);

  const handleAddAll = () => {
    for (const entry of filtered) {
      if (!isSelected(entry)) {
        onImport(entry);
      }
    }
  };

  if (state.status === "loading") {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground" role="status">
        <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
        Loading your {PROVIDER_LABELS[provider]} list…
      </div>
    );
  }

  if (state.status === "error") {
    if (state.reason === "not_linked" || state.reason === "reauth_required") {
      return (
        <div className="flex flex-col gap-2 py-4 text-sm" role="status">
          <p className="text-muted-foreground">
            {state.reason === "not_linked"
              ? `Connect ${PROVIDER_LABELS[provider]} to import from your list.`
              : `Your ${PROVIDER_LABELS[provider]} connection needs to be renewed.`}
          </p>
          <a
            href="/settings"
            className="min-h-11 self-start text-sm font-medium text-primary underline underline-offset-4"
          >
            Go to settings
          </a>
        </div>
      );
    }
    if (state.reason === "rate_limited") {
      return (
        <p className="py-4 text-sm text-muted-foreground" role="status">
          Fetching too fast, one moment.
        </p>
      );
    }
    return (
      <p className="py-4 text-sm text-muted-foreground" role="status">
        {PROVIDER_LABELS[provider]} isn&apos;t responding right now.
      </p>
    );
  }

  const entryCount = state.entries.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar: provider chip, handle, entry count, refresh */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs font-medium text-foreground">
            {provider === "anilist" ? "AL" : "MAL"}
          </span>
          {handle && (
            <span className="text-muted-foreground">@</span>
          )}
          {handle && <span className="font-mono text-xs">{handle}</span>}
          <span>{entryCount.toLocaleString()} entries</span>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          aria-label={`Refresh ${PROVIDER_LABELS[provider]} list`}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          <RefreshCwIcon className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {state.stale && (
        <p className="text-xs text-muted-foreground" role="status">
          {PROVIDER_LABELS[provider]} isn&apos;t responding right now — showing your last synced list.
        </p>
      )}

      {/* Provider / MediaType row */}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedRadioGroup
          label="Provider"
          value={provider}
          options={[
            { value: "anilist", label: "AniList" },
            { value: "mal", label: "MAL" },
          ]}
          onChange={(v) => setProvider(v as Provider)}
          className="self-start"
        />
        <SegmentedRadioGroup
          label="Media type"
          value={mediaType}
          options={[
            { value: "anime", label: "Anime", icon: TvIcon },
            { value: "manga", label: "Manga", icon: BookOpenIcon },
          ]}
          onChange={(v) => setMediaType(v as MediaType)}
          className="self-start"
        />
      </div>

      <StatusFilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCounts={statusCounts}
      />

      {/* Genre + Sort + Search row */}
      <div className="flex flex-wrap items-center gap-2">
        {allGenres.length > 0 && (
          <Select value={genreFilter ?? ""} onValueChange={(v) => setGenreFilter(v || null)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All genres</SelectItem>
              {allGenres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Score ↓</SelectItem>
            <SelectItem value="title">Title A→Z</SelectItem>
            <SelectItem value="updated">Recently updated</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative ml-auto flex-1 max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search within…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search within your list"
            className="h-9 pl-8"
          />
        </div>
      </div>

      {/* Add all shown button */}
      {addableCount > 0 && (
        <button
          type="button"
          onClick={handleAddAll}
          className="flex items-center gap-1.5 self-start rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
          Add all {addableCount} shown
        </button>
      )}

      <ResultGrid entries={filtered} isSelected={isSelected} onImport={onImport} />
    </div>
  );
}
