export type Provider = "anilist" | "mal";
export type MediaType = "anime" | "manga";

/**
 * The shape every adapter converges on at the boundary (invariant 2). `provider`
 * is part of identity, not metadata — the id spaces are disjoint, so a result is
 * meaningless without it. Never widen this to carry a provider-specific field;
 * add it to the adapter's raw response type instead and translate here.
 */
export type UnifiedMediaResult = {
  provider: Provider;
  externalId: number;
  mediaType: MediaType;
  title: string;
  titleNative: string | null;
  coverImage: string | null;
  year: number | null;
  /** The provider's own aggregate score, normalised 0–100. Never the user's rating (D28). */
  averageScore: number | null;
  /**
   * The provider's own genre tags. **Always an array, never `undefined`** — both
   * adapters coerce a missing list to `[]`, so every consumer can map over it
   * without a guard. A list's genre cloud is aggregated from these at read time,
   * never stored on the list itself.
   */
  genres: string[];
};

/**
 * A genre offered for browsing, unified across providers (D-genre-browse). The
 * `label` is what the user reads; the `id` is what the provider's browse query
 * wants — for AniList that is the genre name itself (`genre_in: [String]`), for
 * MAL the numeric `mal_id` stringified (`?genres=<id>`). Kept as a pair so the
 * UI never has to know which provider's vocabulary it is showing.
 */
export type ProviderGenre = { id: string; label: string };

/**
 * Adapters return this instead of throwing for expected failures (a Jikan 504,
 * a timeout). Throwing here means every caller needs a try/catch, and one
 * missing catch takes down the create flow — see code-standards.md.
 */
export type ProviderResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      // "reauth_required" is distinct from "unavailable" (Phase 7 criterion 7)
      // — a dead refresh token means the user must reconnect the provider,
      // never a silently empty list, which reads as "you have nothing rated".
      reason: "timeout" | "rate_limited" | "unavailable" | "not_found" | "reauth_required";
    };

// Re-exported, not redeclared — src/lib/score.ts's SCORE_FORMAT_BOUNDS is the
// single source of truth for valid formats.
import type { ScoreFormat } from "@/lib/score";
export type { ScoreFormat };

/**
 * An imported list entry (Phase 7). `scoreRaw`/`scoreFormat` are both null
 * together or set together (D35) — never a bare `0`, which both trackers use
 * to mean "unrated", not "rated zero".
 *
 * D52: `status`, `genres`, and `year` added for Phase B import workspace.
 */
export type ListStatus = "current" | "planning" | "completed" | "dropped" | "paused" | "repeating";

export type ListEntry = {
  provider: Provider;
  externalId: number;
  mediaType: MediaType;
  title: string;
  titleNative: string | null;
  coverImage: string | null;
  scoreRaw: number | null;
  scoreFormat: ScoreFormat | null;
  status: ListStatus | null;
  genres: string[];
  year: number | null;
};
