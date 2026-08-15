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
};

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
 */
export type ListEntry = {
  provider: Provider;
  externalId: number;
  mediaType: MediaType;
  title: string;
  titleNative: string | null;
  coverImage: string | null;
  scoreRaw: number | null;
  scoreFormat: ScoreFormat | null;
};
