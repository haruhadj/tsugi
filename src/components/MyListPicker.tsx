"use client";

import { useMemo, useState } from "react";
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
import {
  collectGenres,
  countByStatus,
  sortEntries,
  type SortMode,
} from "@/components/my-list-picker/helpers";
import { ResultGrid } from "@/components/my-list-picker/ResultGrid";
import { useMyListEntries } from "@/components/my-list-picker/useMyListEntries";
import { SegmentedRadioGroup } from "@/components/SegmentedRadioGroup";
import type { ListEntry, ListStatus, MediaType, Provider } from "@/lib/types/media";

const PROVIDER_LABELS: Record<Provider, string> = {
  anilist: "AniList",
  mal: "MyAnimeList",
};

const STATUS_CONFIG: { value: ListStatus; label: string }[] = [
  { value: "current", label: "Watching" },
  { value: "planning", label: "Planning" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "dropped", label: "Dropped" },
  { value: "repeating", label: "Repeating" },
];

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListStatus | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("score");

  const { state, refreshing, load } = useMyListEntries(provider, mediaType);

  const allGenres = useMemo(() => {
    if (state.status !== "results") return [];
    return collectGenres(state.entries);
  }, [state]);

  const statusCounts = useMemo(() => {
    if (state.status !== "results") return new Map<ListStatus, number>();
    return countByStatus(state.entries);
  }, [state]);

  const filtered = useMemo(() => {
    if (state.status !== "results") return [];
    let entries = state.entries;

    // Status filter
    if (statusFilter) {
      entries = entries.filter((e) => e.status === statusFilter);
    }

    // Genre filter
    if (genreFilter) {
      entries = entries.filter((e) => e.genres.includes(genreFilter));
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter((e) => e.title.toLowerCase().includes(q));
    }

    return sortEntries(entries, sortMode);
  }, [state, statusFilter, genreFilter, search, sortMode]);

  const handleAddAll = () => {
    for (const entry of filtered) {
      if (!isSelected(entry)) {
        onImport(entry);
      }
    }
  };

  const addableCount = filtered.filter((e) => !isSelected(e)).length;

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

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setStatusFilter(null)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            statusFilter === null
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          All
        </button>
        {STATUS_CONFIG.map(({ value, label }) => {
          const count = statusCounts.get(value) ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {label} <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

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
