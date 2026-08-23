import { z } from "zod";
import { LIST_CATEGORIES } from "@/lib/categories";

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

// Built from the same array `listCategoryEnum` is (src/lib/categories.ts), so
// the Zod schema and the Postgres type cannot disagree about what a category is.
export const listCategorySchema = z.enum(LIST_CATEGORIES);

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

/**
 * The fields that make up a list, shared by create and edit so the two can never
 * drift into disagreeing about what a list is. `publish` is create-only: on an
 * existing list, publishing is its own endpoint with its own `publishedAt`
 * bookkeeping.
 */
const listBodyFields = {
  name: z.string().trim().min(1).max(80),
  // The rundown's filing vocabulary, split from `name` by D48. Required —
  // there is no "uncategorised" state, because a list nobody can find on the
  // rundown is a link with no distribution. The builder defaults the picker
  // to FALLBACK_LIST_CATEGORY so this never blocks publishing.
  category: listCategorySchema,
  caption: z.string().max(120).optional(),
  comment: z.string().max(280).optional(),
  // Phase A/D36 — the old 10-item product cap is gone (lists are now
  // unlimited); this is a DoS ceiling only, sized well above any
  // legitimate list, resolved 4-at-a-time under an 8s deadline downstream
  // (see resolveAllItems's FLAG comment in lists.ts for the scaling risk).
  items: z.array(itemSchema).min(1).max(500),
} as const;

/**
 * Invariant 8, D27 — spans the group and its items, so it lives only in Zod
 * (documented exception to the three-layer rule, PHASE-1.md). Shared by create
 * and edit: an edit that empties a list of every score and note would otherwise
 * be a way to reach a state creating one cannot.
 */
function saysSomething(rec: {
  comment?: string | undefined;
  items: z.infer<typeof itemSchema>[];
}): boolean {
  return Boolean(rec.comment) || rec.items.some(itemSaysSomething);
}

const SAYS_SOMETHING_MESSAGE = {
  message: "A list must include at least one score or comment, at group or item level",
  path: ["comment"],
};

export const createListSchema = z
  .object({
    ...listBodyFields,
    // Publish in the same request that creates the list, rather than a second
    // round-trip to /publish that can fail on its own and strand the list as a
    // draft the author thinks is live. Defaults to false — "Save draft".
    publish: z.boolean().optional(),
  })
  .refine(saysSomething, SAYS_SOMETHING_MESSAGE);

/**
 * Editing an existing list, in full (**D59**). Same shape as creating one, and
 * deliberately a **whole-list replacement** rather than a patch of individual
 * fields: the editor always holds every title, so a partial body would mean
 * inventing merge rules for a client that has no partial state to send.
 * Anything absent is cleared — an omitted `caption` means "remove the caption",
 * not "leave it alone".
 *
 * This replaced the metadata-only `updateListSchema` (name + category, D48),
 * which was the entire edit surface back when editing was out of scope.
 */
export const editListSchema = z
  .object(listBodyFields)
  .refine(saysSomething, SAYS_SOMETHING_MESSAGE);

export type CreateListInput = z.infer<typeof createListSchema>;
export type CreateListItem = z.infer<typeof itemSchema>;
export type EditListInput = z.infer<typeof editListSchema>;
