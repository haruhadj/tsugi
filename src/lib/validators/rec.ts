import { z } from "zod";

/**
 * Per-format bounds — verified live against AniList's own GraphQL schema
 * introspection (`__type(name: "ScoreFormat")`), 2026-08-11, not assumed:
 *
 *   POINT_100        "An integer from 0-100"
 *   POINT_10_DECIMAL "A float from 0-10 with 1 decimal place"
 *   POINT_10         "An integer from 0-10"
 *   POINT_5          "An integer from 0-5. Should be represented in Stars"
 *   POINT_3          "An integer from 0-3. Should be represented in Smileys"
 *
 * AniList's own floor is 0 (their "unrated"). This project's floor is 1
 * (D35) — 0 means unrated here too, so a submitted `0` is rejected rather
 * than stored, which is what keeps invariant 8's "carries a score" check
 * from being satisfied by a falsy zero.
 */
const SCORE_FORMAT_BOUNDS = {
  POINT_100: { min: 1, max: 100, decimals: 0 },
  POINT_10_DECIMAL: { min: 1, max: 10, decimals: 1 },
  POINT_10: { min: 1, max: 10, decimals: 0 },
  POINT_5: { min: 1, max: 5, decimals: 0 },
  POINT_3: { min: 1, max: 3, decimals: 0 },
} as const;

const scoreFormatSchema = z.enum([
  "POINT_100",
  "POINT_10_DECIMAL",
  "POINT_10",
  "POINT_5",
  "POINT_3",
]);

const providerSchema = z.enum(["anilist", "mal"]);
const mediaTypeSchema = z.enum(["anime", "manga"]);

function hasAtMostNDecimals(value: number, n: number): boolean {
  return Number(value.toFixed(n)) === value;
}

const itemSchema = z
  .object({
    provider: providerSchema,
    externalId: z.number().int().positive(),
    mediaType: mediaTypeSchema,
    scoreRaw: z.number().optional(),
    scoreFormat: scoreFormatSchema.optional(),
    comment: z.string().max(280).optional(),
  })
  // "both or neither" (D10, D28's CHECK mirrored here per code-standards.md's
  // three-layer rule) — checked before the range refinement below, since a
  // range check on an absent scoreFormat has nothing to check against.
  .refine((item) => (item.scoreRaw === undefined) === (item.scoreFormat === undefined), {
    message: "scoreRaw and scoreFormat must both be present or both be absent",
    path: ["scoreRaw"],
  })
  .superRefine((item, ctx) => {
    if (item.scoreRaw === undefined || item.scoreFormat === undefined) return;
    const bounds = SCORE_FORMAT_BOUNDS[item.scoreFormat];
    const inRange = item.scoreRaw >= bounds.min && item.scoreRaw <= bounds.max;
    const validPrecision = hasAtMostNDecimals(item.scoreRaw, bounds.decimals);
    if (inRange && validPrecision) return;

    ctx.addIssue({
      code: "custom",
      path: ["scoreRaw"],
      message: `scoreRaw must be between ${bounds.min} and ${bounds.max} for ${item.scoreFormat}${
        bounds.decimals > 0
          ? `, with at most ${bounds.decimals} decimal place`
          : ", as a whole number"
      }`,
    });
  });

function itemSaysSomething(item: z.infer<typeof itemSchema>): boolean {
  return item.scoreRaw !== undefined || Boolean(item.comment);
}

export const createRecSchema = z
  .object({
    caption: z.string().max(120).optional(),
    comment: z.string().max(280).optional(),
    // D36 — capped at 10, resolved 4 at a time under an 8s deadline
    // downstream; the cap itself is enforced here so it is a
    // field-addressable 400, not a silent truncation.
    items: z.array(itemSchema).min(1).max(10),
  })
  // Invariant 8, D27 — spans the group and its items, so it lives only in
  // Zod (documented exception to the three-layer rule, PHASE-1.md).
  .refine(
    (rec) => Boolean(rec.comment) || rec.items.some(itemSaysSomething),
    {
      message: "A recommendation must include at least one score or comment, at group or item level",
      path: ["comment"],
    },
  );

export type CreateRecInput = z.infer<typeof createRecSchema>;
export type CreateRecItem = z.infer<typeof itemSchema>;
