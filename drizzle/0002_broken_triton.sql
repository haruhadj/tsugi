CREATE TABLE "list_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "provider" NOT NULL,
	"media_type" "media_type" NOT NULL,
	"entries" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "list_cache_identity" UNIQUE("user_id","provider","media_type")
);
--> statement-breakpoint
ALTER TABLE "list_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "list_cache" ADD CONSTRAINT "list_cache_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;