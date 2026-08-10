CREATE TYPE "public"."media_type" AS ENUM('anime', 'manga');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('anilist', 'mal');--> statement-breakpoint
CREATE TYPE "public"."score_format" AS ENUM('POINT_100', 'POINT_10_DECIMAL', 'POINT_10', 'POINT_5', 'POINT_3');--> statement-breakpoint
CREATE TABLE "recommendation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(12) NOT NULL,
	"caption" varchar(120),
	"comment" varchar(280),
	"views" integer DEFAULT 0 NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recommendation_slug_unique" UNIQUE("slug"),
	CONSTRAINT "comment_length" CHECK (char_length("recommendation"."comment") <= 280)
);
--> statement-breakpoint
ALTER TABLE "recommendation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recommendation_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"provider" "provider" NOT NULL,
	"external_id" integer NOT NULL,
	"media_type" "media_type" NOT NULL,
	"title" text NOT NULL,
	"cover_image" text,
	"score_raw" numeric(4, 1),
	"score_format" "score_format",
	"comment" varchar(280),
	CONSTRAINT "position_per_recommendation" UNIQUE("recommendation_id","position"),
	CONSTRAINT "identity_per_recommendation" UNIQUE("recommendation_id","provider","external_id","media_type"),
	CONSTRAINT "comment_length" CHECK (char_length("recommendation_item"."comment") <= 280),
	CONSTRAINT "score_pair" CHECK (("recommendation_item"."score_raw" is null) = ("recommendation_item"."score_format" is null)),
	CONSTRAINT "score_positive" CHECK ("recommendation_item"."score_raw" is null or "recommendation_item"."score_raw" > 0)
);
--> statement-breakpoint
ALTER TABLE "recommendation_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"score_format" "score_format" DEFAULT 'POINT_10' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_item" ADD CONSTRAINT "recommendation_item_recommendation_id_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recommendation_user_id_idx" ON "recommendation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recommendation_item_identity_idx" ON "recommendation_item" USING btree ("provider","media_type","external_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");