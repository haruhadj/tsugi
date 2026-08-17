/**
 * Mirrors SCORE_FORMAT_BOUNDS in src/lib/validators/rec.ts exactly. Do not
 * drift — the server is the source of truth, this is the client's copy.
 */
export const SCORE_FORMAT_BOUNDS = {
  POINT_100: { min: 1, max: 100, decimals: 0 },
  POINT_10_DECIMAL: { min: 1, max: 10, decimals: 1 },
  POINT_10: { min: 1, max: 10, decimals: 0 },
  POINT_5: { min: 1, max: 5, decimals: 0 },
  POINT_3: { min: 1, max: 3, decimals: 0 },
} as const;

export type ScoreFormat = keyof typeof SCORE_FORMAT_BOUNDS;

const POINT_3_LABELS: Record<1 | 2 | 3, string> = {
  1: "disliked it",
  2: "it was fine",
  3: "liked it",
};

/**
 * The one score formatter for every surface (tray, public page, dashboard,
 * OG card). POINT_3 is smileys-only text — printing "2/3" is a bug
 * (ui-rules.md § Accessibility). Every other format names its scale.
 */
export function formatScore(scoreRaw: number, scoreFormat: ScoreFormat): string {
  if (scoreFormat === "POINT_3") {
    const key = scoreRaw as 1 | 2 | 3;
    return POINT_3_LABELS[key];
  }

  const bounds = SCORE_FORMAT_BOUNDS[scoreFormat];
  const value = bounds.decimals > 0 ? scoreRaw.toFixed(bounds.decimals) : String(scoreRaw);
  return `${value}/${bounds.max}`;
}

export const SCORE_TIERS = ["excellent", "good", "fair", "poor"] as const;
export type ScoreTier = (typeof SCORE_TIERS)[number];

/**
 * Where a score sits on its own scale, as a 0–1 fraction. Every format has a different
 * range, so `8` is 80% on POINT_10 and 8% on POINT_100 — comparing raw numbers across
 * formats is the exact bug invariant 6 exists to prevent.
 *
 * Note the floor is `min`, not 0: 1/10 is the bottom of the scale, not one tenth of it,
 * because 0 means unrated and never reaches here (D35).
 */
export function scoreFraction(scoreRaw: number, scoreFormat: ScoreFormat): number {
  const bounds = SCORE_FORMAT_BOUNDS[scoreFormat];
  const span = bounds.max - bounds.min;
  if (span <= 0) return 1;
  const clamped = Math.min(Math.max(scoreRaw, bounds.min), bounds.max);
  return (clamped - bounds.min) / span;
}

/**
 * The colour band a score falls in, used by ScoreBadge and by the tier view on
 * /r/[slug]. Derived from the (raw, format) pair, never from a bare number — see
 * scoreFraction. Each tier maps to a `--color-score-*` token in globals.css.
 */
export function scoreTier(scoreRaw: number, scoreFormat: ScoreFormat): ScoreTier {
  const fraction = scoreFraction(scoreRaw, scoreFormat);
  if (fraction >= 0.85) return "excellent";
  if (fraction >= 0.65) return "good";
  if (fraction >= 0.4) return "fair";
  return "poor";
}

/**
 * The letter grades on the tier view, best-first. Five bands rather than the four
 * colour tiers, so S and A share `excellent`'s colour and are told apart by the letter.
 */
export type TierBand = { label: string; tier: ScoreTier; min: number };

/**
 * The bottom band is named separately so that tierBandFor has a fallback the type
 * checker can see is always defined — its `min` of 0 means it matches every score,
 * but `Array.find` is still typed as possibly-undefined.
 */
const LOWEST_BAND: TierBand = { label: "D", tier: "poor", min: 0 };

export const TIER_BANDS: readonly TierBand[] = [
  { label: "S", tier: "excellent", min: 0.9 },
  { label: "A", tier: "excellent", min: 0.8 },
  { label: "B", tier: "good", min: 0.65 },
  { label: "C", tier: "fair", min: 0.4 },
  LOWEST_BAND,
];

/** Which lettered band a score lands in. Unscored items are not banded — filter first. */
export function tierBandFor(scoreRaw: number, scoreFormat: ScoreFormat): TierBand {
  const fraction = scoreFraction(scoreRaw, scoreFormat);
  // TIER_BANDS is ordered best-first, so the first match is the tightest one.
  return TIER_BANDS.find((band) => fraction >= band.min) ?? LOWEST_BAND;
}

/** All valid values for a given format's picker, in ascending order. No zero position (D35). */
export function scoreOptions(scoreFormat: ScoreFormat): number[] {
  const bounds = SCORE_FORMAT_BOUNDS[scoreFormat];
  const step = bounds.decimals > 0 ? 1 / 10 ** bounds.decimals : 1;
  const options: number[] = [];
  for (let v = bounds.min; v <= bounds.max + 1e-9; v += step) {
    options.push(Number(v.toFixed(bounds.decimals)));
  }
  return options;
}
