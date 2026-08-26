import type { ListEntry, ListStatus } from "@/lib/types/media";

export type ListState =
  | { status: "loading" }
  | { status: "results"; entries: ListEntry[]; stale?: boolean }
  | {
      status: "error";
      reason: "not_linked" | "reauth_required" | "rate_limited" | "unavailable" | "timeout" | "not_found";
    };

export function stateFromStatus(status: number): ListState {
  if (status === 404) return { status: "error", reason: "not_linked" };
  if (status === 409) return { status: "error", reason: "reauth_required" };
  if (status === 429) return { status: "error", reason: "rate_limited" };
  if (status === 504) return { status: "error", reason: "timeout" };
  return { status: "error", reason: "unavailable" };
}

export function countByStatus(entries: ListEntry[]): Map<ListStatus, number> {
  const counts = new Map<ListStatus, number>();
  for (const entry of entries) {
    if (entry.status) {
      counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
    }
  }
  return counts;
}

export function collectGenres(entries: ListEntry[]): string[] {
  const genres = new Set<string>();
  for (const entry of entries) {
    for (const genre of entry.genres) {
      if (genre.trim()) genres.add(genre.trim());
    }
  }
  return [...genres].sort((a, b) => a.localeCompare(b));
}

export type SortMode = "score" | "title" | "updated";

export function sortEntries(entries: ListEntry[], mode: SortMode): ListEntry[] {
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
