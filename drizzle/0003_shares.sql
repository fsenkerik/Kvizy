CREATE TABLE "group_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"role" text DEFAULT 'edit' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_shares" ADD CONSTRAINT "group_shares_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_shares" ADD CONSTRAINT "group_shares_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_shares_group_teacher_idx" ON "group_shares" USING btree ("group_id","teacher_id");--> statement-breakpoint
CREATE INDEX "group_shares_teacher_idx" ON "group_shares" USING btree ("teacher_id");