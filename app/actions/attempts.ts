"use server";

import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getOwnedAttempt, getOwnedQuiz, getOwnedStudent } from "@/lib/db/access";
import { currentStudent, requireTeacher } from "@/lib/auth/guards";
import { str } from "./types";
import { buildReview, grade } from "@/lib/quiz/engine";
import { getPointsSummary, quizPoints, syncQuizPoints, syncQuizPointsForAll, type PointsSummary } from "@/lib/points";
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
      /** Body za tento pokus a nový celkový stav. */
      points: PointsSummary & { earned: number; quizMax: number };
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

  // Body: počítá se poslední pokus, ne nejlepší.
  const earned = quizPoints(result.percent, quiz.points);
  await syncQuizPoints(student.id, quiz);
  const summary = await getPointsSummary(student.id, student.class.groupId);

  return {
    ok: true,
    attemptId: attempt.id,
    score: result.score,
    maxScore: result.maxScore,
    percent: result.percent,
    attemptsLeft: quiz.maxAttempts === null ? null : quiz.maxAttempts - used - 1,
    review: quiz.showAnswersAfter ? buildReview(quiz.questions, quiz.id, answers, result.results) : null,
    points: { ...summary, earned, quizMax: quiz.points },
  };
}

/* ---------- Mazání pokusů (učitel) ---------- */

function revalidateQuizResults(quizId: string, topicId: string) {
  revalidatePath(`/ucitel/kvizy/${quizId}/vysledky`);
  revalidatePath(`/ucitel/temata/${topicId}`);
}

/** Smaže jeden konkrétní pokus. */
export async function deleteAttempt(formData: FormData) {
  const teacher = await requireTeacher();
  const attempt = await getOwnedAttempt(teacher.id, str(formData, "attemptId"));
  if (!attempt) return;
  const db = await getDb();
  await db.delete(schema.attempts).where(eq(schema.attempts.id, attempt.id));
  await syncQuizPoints(attempt.studentId, attempt.quiz);
  revalidateQuizResults(attempt.quizId, attempt.quiz.topicId);
  revalidatePath(`/ucitel/tridy/${attempt.student.classId}/vysledky`);
  redirect(`/ucitel/kvizy/${attempt.quizId}/vysledky`);
}

/** Smaže všechny pokusy jednoho studenta u jednoho kvízu (student může kvíz vyplnit znovu). */
export async function deleteStudentQuizAttempts(formData: FormData) {
  const teacher = await requireTeacher();
  const [quiz, student] = await Promise.all([
    getOwnedQuiz(teacher.id, str(formData, "quizId")),
    getOwnedStudent(teacher.id, str(formData, "studentId")),
  ]);
  if (!quiz || !student) return;
  const db = await getDb();
  await db.delete(schema.attempts).where(and(eq(schema.attempts.quizId, quiz.id), eq(schema.attempts.studentId, student.id)));
  await syncQuizPoints(student.id, quiz);
  revalidateQuizResults(quiz.id, quiz.topicId);
  revalidatePath(`/ucitel/tridy/${student.classId}/vysledky`);
}

/** Smaže všechny pokusy všech studentů u kvízu. */
export async function deleteQuizAttempts(formData: FormData) {
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, str(formData, "quizId"));
  if (!quiz) return;
  const db = await getDb();
  await db.delete(schema.attempts).where(eq(schema.attempts.quizId, quiz.id));
  await syncQuizPointsForAll(quiz);
  revalidateQuizResults(quiz.id, quiz.topicId);
}
