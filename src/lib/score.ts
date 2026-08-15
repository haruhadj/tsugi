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
