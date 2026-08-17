CREATE TABLE "list_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"parent_id" uuid,
	"content" varchar(280) NOT NULL,
	"favorite_position" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "list_comment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "list_comment_vote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"direction" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vote_per_user_per_comment" UNIQUE("comment_id","user_id"),
	CONSTRAINT "comment_direction_valid" CHECK ("list_comment_vote"."direction" in (1, -1))
);
--> statement-breakpoint
ALTER TABLE "list_comment_vote" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "list_comment" ADD CONSTRAINT "list_comment_list_id_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_comment" ADD CONSTRAINT "list_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_comment" ADD CONSTRAINT "list_comment_parent_id_list_comment_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."list_comment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_comment_vote" ADD CONSTRAINT "list_comment_vote_comment_id_list_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."list_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_comment_vote" ADD CONSTRAINT "list_comment_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_comment_list_id_created_at_idx" ON "list_comment" USING btree ("list_id","created_at");--> statement-breakpoint
CREATE INDEX "list_comment_parent_id_idx" ON "list_comment" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "list_comment_vote_comment_id_idx" ON "list_comment_vote" USING btree ("comment_id");