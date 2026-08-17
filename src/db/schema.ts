import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  type AnyPgColumn,
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
import { mediaTypeEnum, providerEnum, scoreFormatEnum } from "./enums";

export { mediaTypeEnum, providerEnum, scoreFormatEnum };

export const list = pgTable(
  "list",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 12 }).notNull().unique(),
    // User-chosen category title, e.g. "Romance", "Action" — required (D42).
    name: varchar("name", { length: 80 }).notNull(),
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

/*
  Discussion on a published list (D44, which reversed D43's "voting only").

  Threading is one level deep and enforced in the service layer: a reply's parentId
  must name a comment whose own parentId is null. The column cannot express that, and
  a deeper tree would need recursive reads and a collapse UI that the product does not
  have.

  `parentId` deliberately does NOT cascade. A self-referential cascade means deleting
  one row silently deletes an unbounded subtree, so deleteComment removes replies
  explicitly, in a transaction, where the count is knowable.
*/
export const listComment = pgTable(
  "list_comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => list.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => listComment.id),
    // 280 everywhere a comment exists — invariant 7. Mirrored in the Zod schema
    // (src/lib/validators/comment.ts) and in the composer's counter.
    content: varchar("content", { length: 280 }).notNull(),
    /*
      The commenter's pick from the list, as the item's `position` rather than its
      row id: invariant 1 forbids a database id in an API response, and position is
      already public — it is the slot number rendered beside every title. Validated
      against the list's own items on insert, and resolved back to a title on read.
    */
    favoritePosition: integer("favorite_position"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("list_comment_list_id_created_at_idx").on(table.listId, table.createdAt),
    index("list_comment_parent_id_idx").on(table.parentId),
  ],
).enableRLS();

export const listCommentVote = pgTable(
  "list_comment_vote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => listComment.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Same contract as listVote: 1 or -1, and un-voting deletes the row.
    direction: smallint("direction").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    check("comment_direction_valid", sql`${table.direction} in (1, -1)`),
    unique("vote_per_user_per_comment").on(table.commentId, table.userId),
    index("list_comment_vote_comment_id_idx").on(table.commentId),
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
