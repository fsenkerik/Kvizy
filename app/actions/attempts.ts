"use server";

import { and, count, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { currentStudent } from "@/lib/auth/guards";
import { buildReview, grade } from "@/lib/quiz/engine";
import type { AnswerMap, ReviewQuestion } from "@/lib/quiz/types";

export type SubmitResult =
  | { ok: false; error: string }
  | {
      ok: true;
      attemptId: string;
      score: number;
      maxScore: number;
      percent: number;
      attemptsLeft: number | null;
      /** Jen když má kvíz zapnuté zobrazení správných odpovědí. */
      review: ReviewQuestion[] | null;
    };

/** Sanitizace odpovědí z klienta – necháme jen povolené tvary hodnot. */
function sanitizeAnswers(raw: unknown): AnswerMap {
  const out: AnswerMap = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length > 64) continue;
    if (value === null || typeof value === "number" || typeof value === "boolean") out[key] = value;
    else if (typeof value === "string") out[key] = value.slice(0, 500);
    else if (Array.isArray(value) && value.length <= 100 && value.every((v) => v === null || typeof v === "number"))
      out[key] = value as (number | null)[];
  }
  return out;
}

export async function submitAttempt(quizId: string, rawAnswers: unknown): Promise<SubmitResult> {
  const student = await currentStudent();
  if (!student) return { ok: false, error: "Nejsi přihlášený/á. Obnov stránku a přihlas se znovu." };

  const db = await getDb();
  const quiz = await db.query.quizzes.findFirst({
    where: eq(schema.quizzes.id, quizId),
    with: { topic: true },
  });
  if (!quiz || quiz.topic.groupId !== student.class.groupId) return { ok: false, error: "Kvíz nenalezen." };
  if (!quiz.isOpen || !quiz.topic.isVisible) return { ok: false, error: "Kvíz je momentálně uzavřený." };

  const [{ used }] = await db
    .select({ used: count() })
    .from(schema.attempts)
    .where(and(eq(schema.attempts.quizId, quiz.id), eq(schema.attempts.studentId, student.id)));
  if (quiz.maxAttempts !== null && used >= quiz.maxAttempts) {
    return { ok: false, error: "Vyčerpal/a jsi všechny pokusy." };
  }

  const answers = sanitizeAnswers(rawAnswers);
  const result = grade(quiz.questions, quiz.id, answers);

  const [attempt] = await db
    .insert(schema.attempts)
    .values({
      quizId: quiz.id,
      studentId: student.id,
      attemptNumber: used + 1,
      answers,
      results: result.results,
      score: result.score,
      maxScore: result.maxScore,
      percent: result.percent,
    })
    .returning({ id: schema.attempts.id });

  return {
    ok: true,
    attemptId: attempt.id,
    score: result.score,
    maxScore: result.maxScore,
    percent: result.percent,
    attemptsLeft: quiz.maxAttempts === null ? null : quiz.maxAttempts - used - 1,
    review: quiz.showAnswersAfter ? buildReview(quiz.questions, quiz.id, answers, result.results) : null,
  };
}
