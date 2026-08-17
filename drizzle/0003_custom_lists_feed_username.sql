ALTER TABLE "recommendation" RENAME TO "list";--> statement-breakpoint
ALTER TABLE "recommendation_item" RENAME TO "list_item";--> statement-breakpoint
ALTER TABLE "list_item" RENAME COLUMN "recommendation_id" TO "list_id";--> statement-breakpoint
ALTER TABLE "list" RENAME CONSTRAINT "recommendation_slug_unique" TO "list_slug_unique";--> statement-breakpoint
ALTER TABLE "list" RENAME CONSTRAINT "recommendation_user_id_user_id_fk" TO "list_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "list_item" RENAME CONSTRAINT "recommendation_item_recommendation_id_recommendation_id_fk" TO "list_item_list_id_list_id_fk";--> statement-breakpoint
ALTER TABLE "list_item" RENAME CONSTRAINT "position_per_recommendation" TO "position_per_list";--> statement-breakpoint
ALTER TABLE "list_item" RENAME CONSTRAINT "identity_per_recommendation" TO "identity_per_list";--> statement-breakpoint
ALTER INDEX "recommendation_user_id_idx" RENAME TO "list_user_id_idx";--> statement-breakpoint
ALTER INDEX "recommendation_item_identity_idx" RENAME TO "list_item_identity_idx";--> statement-breakpoint
CREATE TABLE "list_vote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"direction" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "direction_valid" CHECK ("direction" in (1, -1)),
	CONSTRAINT "vote_per_user_per_list" UNIQUE("list_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "list_vote" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "list" ADD COLUMN "name" varchar(80);--> statement-breakpoint
ALTER TABLE "list" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "list" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
UPDATE "list" SET "name" = COALESCE("caption", 'Untitled');--> statement-breakpoint
UPDATE "list" SET "published" = true, "published_at" = "created_at";--> statement-breakpoint
ALTER TABLE "list" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "list_vote" ADD CONSTRAINT "list_vote_list_id_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_vote" ADD CONSTRAINT "list_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_published_idx" ON "list" USING btree ("published","published_at");--> statement-breakpoint
CREATE INDEX "list_vote_list_id_idx" ON "list_vote" USING btree ("list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_lower_idx" ON "user" USING btree (lower("username"));--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "username_format" CHECK ("username" ~ '^[a-zA-Z0-9_]{3,20}$');
