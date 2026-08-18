import { pgEnum } from "drizzle-orm/pg-core";
import { LIST_CATEGORIES } from "@/lib/categories";

// The id space a media identifier belongs to — not the API that answered it.
// Jikan and the official MAL v2 API both return `mal` ids (invariant 2, D29).
export const providerEnum = pgEnum("provider", ["anilist", "mal"]);

export const mediaTypeEnum = pgEnum("media_type", ["anime", "manga"]);

// The five AniList score scales, plus MAL's single POINT_10 scale (D28).
export const scoreFormatEnum = pgEnum("score_format", [
  "POINT_100",
  "POINT_10_DECIMAL",
  "POINT_10",
  "POINT_5",
  "POINT_3",
]);

/**
 * The list's rundown category (D48). The vocabulary itself lives in
 * `src/lib/categories.ts`, not here — `db/` may import `lib/` but never the
 * reverse (architecture.md), and the Zod validator needs the same array.
 * `pgEnum` is given a mutable copy because Drizzle's signature wants `string[]`;
 * `LIST_CATEGORIES` stays `as const` so the TypeScript union survives.
 */
export const listCategoryEnum = pgEnum("list_category", [...LIST_CATEGORIES]);
