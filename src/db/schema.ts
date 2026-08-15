import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { mediaTypeEnum, providerEnum, scoreFormatEnum } from "./enums";

export { mediaTypeEnum, providerEnum, scoreFormatEnum };

export const recommendation = pgTable(
  "recommendation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 12 }).notNull().unique(),
    caption: varchar("caption", { length: 120 }),
    comment: varchar("comment", { length: 280 }),
    views: integer("views").notNull().default(0),
    // Not nullable — creating a recommendation always requires a session (D23).
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  // Comment length is enforced by varchar(280) itself — a CHECK here would
  // never fire, since Postgres rejects an oversized value at the type level
  // (22001) before any row-level constraint is evaluated.
  (table) => [index("recommendation_user_id_idx").on(table.userId)],
).enableRLS();

export const recommendationItem = pgTable(
  "recommendation_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendation.id, { onDelete: "cascade" }),
    // Explicit order — never rely on insertion order.
    position: integer("position").notNull(),
    provider: providerEnum("provider").notNull(),
    // Meaningless without `provider` — the AniList and MAL id spaces are disjoint.
    externalId: integer("external_id").notNull(),
    mediaType: mediaTypeEnum("media_type").notNull(),
    // Resolved server-side at creation time — never trusted from the client (D13).
    title: text("title").notNull(),
    coverImage: text("cover_image"),
    // mode: "number" is mandatory here — numeric() defaults to string mode, which
    // would make every score "87.0" in TypeScript and in API JSON (tech-stack.md).
    scoreRaw: numeric("score_raw", { precision: 4, scale: 1, mode: "number" }),
    scoreFormat: scoreFormatEnum("score_format"),
    comment: varchar("comment", { length: 280 }),
  },
  (table) => [
    // A number without its scale is meaningless (invariant 6) — both null or both set.
    check(
      "score_pair",
      sql`(${table.scoreRaw} is null) = (${table.scoreFormat} is null)`,
    ),
    // Both trackers use 0 to mean "unrated", not "rated zero" (D35).
    check("score_positive", sql`${table.scoreRaw} is null or ${table.scoreRaw} > 0`),
    unique("position_per_recommendation").on(table.recommendationId, table.position),
    unique("identity_per_recommendation").on(
      table.recommendationId,
      table.provider,
      table.externalId,
      table.mediaType,
    ),
    // The identity triple, in the order named by tech-stack.md and PHASE-1.md.
    index("recommendation_item_identity_idx").on(
      table.provider,
      table.mediaType,
      table.externalId,
    ),
  ],
).enableRLS();

// Per-user cache of a fetched list (Phase 7 scope). One row per (user,
// provider, mediaType) — a re-fetch within TTL reads this instead of hitting
// AniList/MAL again. `entries` mirrors `ListEntry[]` (src/lib/types/media.ts)
// exactly, so it already carries the D28/D35 null-pairing invariant; nothing
// here re-validates that shape, since it is only ever written from a
// `ProviderResult` that already satisfies it.
export const listCache = pgTable(
  "list_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: providerEnum("provider").notNull(),
    mediaType: mediaTypeEnum("media_type").notNull(),
    entries: jsonb("entries").notNull(),
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  },
  (table) => [
    unique("list_cache_identity").on(table.userId, table.provider, table.mediaType),
  ],
).enableRLS();
