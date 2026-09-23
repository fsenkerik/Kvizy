ALTER TABLE "quizzes" ADD COLUMN "shuffle_questions" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "shuffle_options" boolean DEFAULT true NOT NULL;