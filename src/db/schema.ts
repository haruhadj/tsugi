import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { listCategoryEnum, mediaTypeEnum, providerEnum, scoreFormatEnum } from "./enums";

export { listCategoryEnum, mediaTypeEnum, providerEnum, scoreFormatEnum };

export const list = pgTable(
  "list",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 12 }).notNull().unique(),
    // The list's free-text title, e.g. "Ten romances that actually end" (D48).
    // Until D48 this column doubled as the feed's category (D42); `category`
    // below now carries that, and this is a title and nothing else.
    name: varchar("name", { length: 80 }).notNull(),
    // What the rundown files this list under — a fixed vocabulary, not free
    // text, so the feed's chips are a directory rather than whatever people
    // typed (D48). Backfilled from `name` for pre-D48 rows.
    category: listCategoryEnum("category").notNull(),
    caption: varchar("caption", { length: 120 }),
    comment: varchar("comment", { length: 280 }),
    views: integer("views").notNull().default(0),
    // Draft lists are owner-only; published lists appear on /feed and are
    // publicly readable at /r/[slug] (D42).
    published: boolean("published").notNull().default(false),
    publishedAt: timestamp("published_at"),
    // Not nullable — creating a list always requires a session (D23).
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  // Comment length is enforced by varchar(280) itself — a CHECK here would
  // never fire, since Postgres rejects an oversized value at the type level
  // (22001) before any row-level constraint is evaluated.
  (table) => [
    index("list_user_id_idx").on(table.userId),
    index("list_published_idx").on(table.published, table.publishedAt),
  ],
).enableRLS();

export const listItem = pgTable(
  "list_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => list.id, { onDelete: "cascade" }),
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
    // The provider's own genre tags, resolved server-side with the rest of the
    // item (D48). A native text[] rather than jsonb because the feed filters on
    // it — `= any(genres)` against a GIN index, where jsonb would need unnesting.
    // The `'{}'` default is a constant, so adding this column was a metadata-only
    // change: no table rewrite, and pre-D48 rows simply carry an empty array
    // until they are re-saved.
    genres: text("genres").array().notNull().default(sql`'{}'::text[]`),
  },
  (table) => [
    // A number without its scale is meaningless (invariant 6) — both null or both set.
    check(
      "score_pair",
      sql`(${table.scoreRaw} is null) = (${table.scoreFormat} is null)`,
    ),
    // Both trackers use 0 to mean "unrated", not "rated zero" (D35).
    check("score_positive", sql`${table.scoreRaw} is null or ${table.scoreRaw} > 0`),
    unique("position_per_list").on(table.listId, table.position),
    unique("identity_per_list").on(
      table.listId,
      table.provider,
      table.externalId,
      table.mediaType,
    ),
    // The identity triple, in the order named by tech-stack.md and PHASE-1.md.
    index("list_item_identity_idx").on(
      table.provider,
      table.mediaType,
      table.externalId,
    ),
    // Backs the feed's genre filter, which asks "does this item carry X" across
    // every published list. A btree cannot answer containment on an array.
    index("list_item_genres_gin_idx").using("gin", table.genres),
  ],
).enableRLS();

export const listVote = pgTable(
  "list_vote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => list.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // 1 = upvote, -1 = downvote. No "0" state — un-voting deletes the row.
    direction: smallint("direction").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    check("direction_valid", sql`${table.direction} in (1, -1)`),
    unique("vote_per_user_per_list").on(table.listId, table.userId),
    index("list_vote_list_id_idx").on(table.listId),
  ],
).enableRLS();

// One row per (list, user) that has ever viewed it — the durable record a
// logged-in viewer's repeat visits are deduped against, unlike the anonymous
// path's browser-session cookie (middleware.ts). Never deleted or updated;
// its mere existence is the dedup signal, so `list.views` only increments
// when the insert here actually lands a new row.
export const listView = pgTable(
  "list_view",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => list.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("view_per_user_per_list").on(table.listId, table.userId),
    index("list_view_list_id_idx").on(table.listId),
  ],
).enableRLS();

// Per-user cache of a fetched list (Phase 7 scope). One row per (user,
// provider, mediaType) — a re-fetch within TTL reads this instead of hitting
// AniList/MAL again. `entries` mirrors `ListEntry[]` (src/lib/types/media.ts)
// exactly, so it already carries the D28/D35 null-pairing invariant; nothing
// here re-validates that shape, since it is only ever written from a
// `ProviderResult` that already satisfies it.
//
// D52: `version` tracks the schema version. Bump CACHE_VERSION in
// trackerLists.ts when ListEntry shape changes; stale rows re-fetch once.
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
    version: integer("version").notNull().default(1),
  },
  (table) => [
    unique("list_cache_identity").on(table.userId, table.provider, table.mediaType),
  ],
).enableRLS();
