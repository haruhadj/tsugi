CREATE TYPE "public"."list_category" AS ENUM('Action', 'Adventure', 'Comedy', 'Cyberpunk', 'Drama', 'Fantasy', 'Horror', 'Isekai', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Eclectic / Multi-Genre');--> statement-breakpoint
--
-- D48 — `category` splits from `name`. Hand-edited from drizzle-kit's generated
-- `ADD COLUMN ... NOT NULL`, which has no default and so fails outright against a
-- table that already has rows. Same three-step shape as migration 0003:
-- add nullable, backfill, then constrain.
--
ALTER TABLE "list" ADD COLUMN "category" "list_category";--> statement-breakpoint
--
-- Until now `name` doubled as the category, so where a name happens to *be* one of
-- the vocabulary's values it carries over; everything else lands in the catch-all.
-- Checked against production before writing this: every existing list is named
-- "Untitled", "test", or "Phase 5 verification run", so in practice this assigns
-- the catch-all to all 20 rows. The CASE is still written generally, because the
-- staging and local databases are not the production one.
--
UPDATE "list" SET "category" = CASE
  WHEN lower("name") = ANY (ARRAY[
    'action','adventure','comedy','cyberpunk','drama','fantasy','horror','isekai',
    'mecha','music','mystery','psychological','romance','sci-fi','slice of life',
    'sports','supernatural','thriller','eclectic / multi-genre'
  ])
  THEN initcap("name")::"list_category"
  ELSE 'Eclectic / Multi-Genre'::"list_category"
END;--> statement-breakpoint
--
-- `initcap` uppercases the first letter of every word, which is exactly how the
-- vocabulary is cased for all but two values. Those two are corrected here rather
-- than by complicating the CASE above.
--
UPDATE "list" SET "category" = 'Sci-Fi'::"list_category" WHERE lower("name") = 'sci-fi';--> statement-breakpoint
UPDATE "list" SET "category" = 'Eclectic / Multi-Genre'::"list_category" WHERE lower("name") = 'eclectic / multi-genre';--> statement-breakpoint
ALTER TABLE "list" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
--
-- A constant default, so this is a metadata-only change: no table rewrite and no
-- backfill pass. Pre-D48 items simply carry an empty array until they are
-- re-saved — genres have never been fetched, so there is nothing to derive from.
--
ALTER TABLE "list_item" ADD COLUMN "genres" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "list_item_genres_gin_idx" ON "list_item" USING gin ("genres");
