import { useMemo, useState } from "react";
import {
  collectGenres,
  countByStatus,
  sortEntries,
  type ListState,
  type SortMode,
} from "@/components/my-list-picker/helpers";
import type { ListEntry, ListStatus } from "@/lib/types/media";

/**
 * Filter/sort/search state over the loaded entries, plus the derived genre
 * list, status tally, and filtered result set. Split out of `MyListPicker` so
 * the component itself is just the header/controls/grid layout.
 */
export function useMyListFilters(state: ListState, isSelected: (entry: ListEntry) => boolean) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListStatus | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("score");

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

    if (statusFilter) {
      entries = entries.filter((e) => e.status === statusFilter);
    }

    if (genreFilter) {
      entries = entries.filter((e) => e.genres.includes(genreFilter));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter((e) => e.title.toLowerCase().includes(q));
    }

    return sortEntries(entries, sortMode);
  }, [state, statusFilter, genreFilter, search, sortMode]);

  const addableCount = filtered.filter((e) => !isSelected(e)).length;

  return {
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
  };
}
