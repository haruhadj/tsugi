"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenIcon,
  CheckIcon,
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
import { MediaCover } from "@/components/MediaCover";
import { ScoreBadge } from "@/components/ScoreBadge";
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

type ListState =
  | { status: "loading" }
  | { status: "results"; entries: ListEntry[]; stale?: boolean }
  | {
      status: "error";
      reason: "not_linked" | "reauth_required" | "rate_limited" | "unavailable" | "timeout" | "not_found";
    };

function stateFromStatus(status: number): ListState {
  if (status === 404) return { status: "error", reason: "not_linked" };
  if (status === 409) return { status: "error", reason: "reauth_required" };
  if (status === 429) return { status: "error", reason: "rate_limited" };
  if (status === 504) return { status: "error", reason: "timeout" };
  return { status: "error", reason: "unavailable" };
}

function countByStatus(entries: ListEntry[]): Map<ListStatus, number> {
  const counts = new Map<ListStatus, number>();
  for (const entry of entries) {
    if (entry.status) {
      counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
    }
  }
  return counts;
}

function collectGenres(entries: ListEntry[]): string[] {
  const genres = new Set<string>();
  for (const entry of entries) {
    for (const genre of entry.genres) {
      if (genre.trim()) genres.add(genre.trim());
    }
  }
  return [...genres].sort((a, b) => a.localeCompare(b));
}

type SortMode = "score" | "title" | "updated";

function sortEntries(entries: ListEntry[], mode: SortMode): ListEntry[] {
  const sorted = [...entries];
  switch (mode) {
    case "score":
      return sorted.sort((a, b) => (b.scoreRaw ?? 0) - (a.scoreRaw ?? 0));
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "updated":
      // No updated timestamp available from trackers; fall back to title sort
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

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
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListStatus | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("score");
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, ListState>>(new Map());

  const load = (force: boolean) => {
    const key = `${provider}:${mediaType}`;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (force) {
      setRefreshing(true);
    } else {
      setState({ status: "loading" });
    }

    fetch(`/api/lists/${provider}/${mediaType}${force ? "?refresh=1" : ""}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (controller.signal.aborted) return;
        if (res.status === 200) {
          const data = (await res.json()) as { entries: ListEntry[]; stale?: boolean };
          const next: ListState = { status: "results", entries: data.entries, stale: data.stale };
          cacheRef.current.set(key, next);
          setState(next);
        } else {
          const next = stateFromStatus(res.status);
          cacheRef.current.set(key, next);
          setState(next);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error", reason: "unavailable" });
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
  };

  useEffect(() => {
    const key = `${provider}:${mediaType}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setState(cached);
      return;
    }
    load(false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, mediaType]);

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

      {/* Results grid */}
      {filtered.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">No titles match.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {filtered.map((entry) => {
            const selected = isSelected(entry);
            return (
              <li
                key={`${entry.provider}-${entry.externalId}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="relative aspect-[2/3]">
                  <MediaCover
                    src={entry.coverImage}
                    title={entry.title}
                    width={200}
                    height={300}
                    className="size-full object-cover"
                  />
                  {entry.scoreRaw != null && entry.scoreFormat && (
                    <div className="absolute bottom-1 right-1 z-10">
                      <ScoreBadge scoreRaw={entry.scoreRaw} scoreFormat={entry.scoreFormat} size="sm" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 p-2">
                  <span className="line-clamp-2 text-xs font-medium leading-tight">{entry.title}</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {entry.year && <span>{entry.year}</span>}
                    {entry.genres.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{entry.genres.slice(0, 2).join(", ")}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={selected}
                  onClick={() => onImport(entry)}
                  className={`absolute top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full transition-colors ${
                    selected
                      ? "bg-success/90 text-success-foreground"
                      : "bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100"
                  }`}
                  aria-label={selected ? "Added" : "Add to list"}
                >
                  {selected ? (
                    <CheckIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <PlusIcon className="size-4" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
