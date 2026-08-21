CREATE TABLE "list_view" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "view_per_user_per_list" UNIQUE("list_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "list_view" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "list_view" ADD CONSTRAINT "list_view_list_id_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_view" ADD CONSTRAINT "list_view_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_view_list_id_idx" ON "list_view" USING btree ("list_id");