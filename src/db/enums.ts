import { pgEnum } from "drizzle-orm/pg-core";

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
