CREATE TABLE "link_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"link_id" text NOT NULL,
	"student_id" text NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "point_events" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"source_key" text NOT NULL,
	"quiz_id" text,
	"link_id" text,
	"label" text NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "points" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "points" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "link_visits" ADD CONSTRAINT "link_visits_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_visits" ADD CONSTRAINT "link_visits_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "link_visits_link_student_idx" ON "link_visits" USING btree ("link_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "point_events_student_source_idx" ON "point_events" USING btree ("student_id","source_key");--> statement-breakpoint
CREATE INDEX "point_events_student_idx" ON "point_events" USING btree ("student_id");