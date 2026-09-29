"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getOwnedQuiz } from "@/lib/db/access";
import { requireTeacher } from "@/lib/auth/guards";
import { questionSchema } from "@/lib/quiz/schema";
import { newId } from "@/lib/ids";
import type { Question } from "@/lib/quiz/types";

export type QuestionActionResult = { ok: true } | { ok: false; errors: string[] };

async function loadQuiz(quizId: string) {
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, quizId);
  return quiz;
}

async function saveQuestions(quiz: { id: string; topicId: string }, questions: Question[]) {
  const db = await getDb();
  await db.update(schema.quizzes).set({ questions }).where(eq(schema.quizzes.id, quiz.id));
  revalidatePath(`/ucitel/kvizy/${quiz.id}/nahled`);
  revalidatePath(`/ucitel/kvizy/${quiz.id}`);
  revalidatePath(`/ucitel/temata/${quiz.topicId}`);
}

function formatErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((i) => (i.path.length ? `${i.path.join(" › ")}: ${i.message}` : i.message));
}

/**
 * Uloží otázku – buď upraví existující (podle `questionId`), nebo přidá novou na konec.
 * Otázka si ponechá své id, aby starší pokusy studentů zůstaly napárované.
 */
export async function saveQuestion(quizId: string, raw: unknown, questionId?: string): Promise<QuestionActionResult> {
  const quiz = await loadQuiz(quizId);
  if (!quiz) return { ok: false, errors: ["Kvíz nenalezen."] };

  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formatErrors(parsed.error.issues) };

  const questions = [...quiz.questions];
  if (questionId) {
    const index = questions.findIndex((q) => q.id === questionId);
    if (index < 0) return { ok: false, errors: ["Otázka nenalezena."] };
    questions[index] = { ...parsed.data, id: questionId } as Question;
  } else {
    questions.push({ ...parsed.data, id: newId() } as Question);
  }

  await saveQuestions(quiz, questions);
  return { ok: true };
}

export async function deleteQuestion(quizId: string, questionId: string): Promise<QuestionActionResult> {
  const quiz = await loadQuiz(quizId);
  if (!quiz) return { ok: false, errors: ["Kvíz nenalezen."] };
  if (quiz.questions.length <= 1) return { ok: false, errors: ["Kvíz musí mít alespoň jednu otázku."] };

  const questions = quiz.questions.filter((q) => q.id !== questionId);
  if (questions.length === quiz.questions.length) return { ok: false, errors: ["Otázka nenalezena."] };

  await saveQuestions(quiz, questions);
  return { ok: true };
}

export async function moveQuestion(quizId: string, questionId: string, direction: "up" | "down"): Promise<QuestionActionResult> {
  const quiz = await loadQuiz(quizId);
  if (!quiz) return { ok: false, errors: ["Kvíz nenalezen."] };

  const questions = [...quiz.questions];
  const index = questions.findIndex((q) => q.id === questionId);
  const target = index + (direction === "up" ? -1 : 1);
  if (index < 0 || target < 0 || target >= questions.length) return { ok: true };

  [questions[index], questions[target]] = [questions[target], questions[index]];
  await saveQuestions(quiz, questions);
  return { ok: true };
}

/** Kopie otázky hned za originál – užitečné pro podobné otázky. */
export async function duplicateQuestion(quizId: string, questionId: string): Promise<QuestionActionResult> {
  const quiz = await loadQuiz(quizId);
  if (!quiz) return { ok: false, errors: ["Kvíz nenalezen."] };

  const index = quiz.questions.findIndex((q) => q.id === questionId);
  if (index < 0) return { ok: false, errors: ["Otázka nenalezena."] };

  const copy = { ...quiz.questions[index], id: newId() } as Question;
  const questions = [...quiz.questions];
  questions.splice(index + 1, 0, copy);
  await saveQuestions(quiz, questions);
  return { ok: true };
}
