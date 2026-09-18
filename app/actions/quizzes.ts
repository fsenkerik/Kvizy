"use server";

import { asc, eq, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getOwnedQuiz, getOwnedTopic } from "@/lib/db/access";
import { requireTeacher } from "@/lib/auth/guards";
import { parseQuizJson } from "@/lib/quiz/schema";
import { syncQuizPointsForAll } from "@/lib/points";
import { type ActionState, intOrNull, str } from "./types";

export type QuizJsonState = { error?: string; success?: string; errors?: string[] } | undefined;

export async function createQuizFromJson(_prev: QuizJsonState, formData: FormData): Promise<QuizJsonState> {
  const teacher = await requireTeacher();
  const topic = await getOwnedTopic(teacher.id, str(formData, "topicId"));
  if (!topic) return { error: "Téma nenalezeno." };

  const parsed = parseQuizJson(String(formData.get("json") ?? ""));
  if (!parsed.ok) return { error: "JSON obsahuje chyby.", errors: parsed.errors };

  const db = await getDb();
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(schema.quizzes.sortOrder) })
    .from(schema.quizzes)
    .where(eq(schema.quizzes.topicId, topic.id));
  await db.insert(schema.quizzes).values({
    topicId: topic.id,
    title: parsed.quiz.title,
    description: parsed.quiz.description ?? null,
    questions: parsed.quiz.questions,
    maxAttempts: 1,
    showAnswersAfter: true,
    isOpen: true,
    sortOrder: (maxOrder ?? 0) + 1,
  });
  revalidatePath(`/ucitel/temata/${topic.id}`);
  return { success: `Kvíz „${parsed.quiz.title}“ přidán (${parsed.quiz.questions.length} otázek).` };
}

export async function updateQuizJson(_prev: QuizJsonState, formData: FormData): Promise<QuizJsonState> {
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, str(formData, "quizId"));
  if (!quiz) return { error: "Kvíz nenalezen." };

  const parsed = parseQuizJson(String(formData.get("json") ?? ""));
  if (!parsed.ok) return { error: "JSON obsahuje chyby.", errors: parsed.errors };

  const db = await getDb();
  await db
    .update(schema.quizzes)
    .set({ title: parsed.quiz.title, description: parsed.quiz.description ?? null, questions: parsed.quiz.questions })
    .where(eq(schema.quizzes.id, quiz.id));
  revalidatePath(`/ucitel/kvizy/${quiz.id}`);
  revalidatePath(`/ucitel/temata/${quiz.topicId}`);
  return { success: "Kvíz uložen." };
}

export async function updateQuizSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, str(formData, "quizId"));
  if (!quiz) return { error: "Kvíz nenalezen." };

  const attemptsMode = str(formData, "attemptsMode"); // "one" | "unlimited" | "custom"
  let maxAttempts: number | null = 1;
  if (attemptsMode === "unlimited") maxAttempts = null;
  else if (attemptsMode === "custom") {
    const n = intOrNull(formData, "maxAttempts");
    if (!n || n < 1) return { error: "Počet pokusů musí být alespoň 1." };
    maxAttempts = n;
  }

  const points = intOrNull(formData, "points");
  if (points === null || points < 0 || points > 1000) return { error: "Body za kvíz musí být číslo 0–1000." };

  const db = await getDb();
  await db
    .update(schema.quizzes)
    .set({
      maxAttempts,
      showAnswersAfter: formData.get("showAnswersAfter") === "on",
      isOpen: formData.get("isOpen") === "on",
      points,
    })
    .where(eq(schema.quizzes.id, quiz.id));
  if (points !== quiz.points) await syncQuizPointsForAll({ id: quiz.id, title: quiz.title, points });
  revalidatePath(`/ucitel/kvizy/${quiz.id}`);
  revalidatePath(`/ucitel/temata/${quiz.topicId}`);
  return { success: "Nastavení uloženo." };
}

export async function toggleQuizOpen(formData: FormData) {
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, str(formData, "quizId"));
  if (!quiz) return;
  const db = await getDb();
  await db.update(schema.quizzes).set({ isOpen: !quiz.isOpen }).where(eq(schema.quizzes.id, quiz.id));
  revalidatePath(`/ucitel/temata/${quiz.topicId}`);
  revalidatePath(`/ucitel/kvizy/${quiz.id}`);
}

export async function moveQuiz(formData: FormData) {
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, str(formData, "quizId"));
  if (!quiz) return;
  const direction = str(formData, "direction") === "up" ? -1 : 1;

  const db = await getDb();
  const siblings = await db.query.quizzes.findMany({
    where: eq(schema.quizzes.topicId, quiz.topicId),
    orderBy: [asc(schema.quizzes.sortOrder), asc(schema.quizzes.createdAt)],
  });
  const index = siblings.findIndex((q) => q.id === quiz.id);
  if (!siblings[index + direction]) return;
  const reordered = siblings.map((q, i) => ({ id: q.id, order: i + 1 }));
  const a = reordered[index];
  const b = reordered[index + direction];
  [a.order, b.order] = [b.order, a.order];
  for (const r of reordered) {
    await db.update(schema.quizzes).set({ sortOrder: r.order }).where(eq(schema.quizzes.id, r.id));
  }
  revalidatePath(`/ucitel/temata/${quiz.topicId}`);
}

export async function deleteQuiz(formData: FormData) {
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, str(formData, "quizId"));
  if (!quiz) return;
  const db = await getDb();
  await db.delete(schema.quizzes).where(eq(schema.quizzes.id, quiz.id));
  revalidatePath(`/ucitel/temata/${quiz.topicId}`);
  redirect(`/ucitel/temata/${quiz.topicId}`);
}

const MAX_HTML_BYTES = 2 * 1024 * 1024;

/** Nahrání hotového HTML kvízu (původní formát) – převede se na JSON a uloží jako nový kvíz. */
export async function createQuizFromHtml(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const topic = await getOwnedTopic(teacher.id, str(formData, "topicId"));
  if (!topic) return { error: "Téma nenalezeno." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Vyber soubor .html s kvízem." };
  if (file.size > MAX_HTML_BYTES) return { error: "Soubor je příliš velký (max 2 MB)." };

  let quiz;
  try {
    const { convertHtmlQuiz } = await import("@/lib/quiz/convert-html");
    quiz = convertHtmlQuiz(await file.text());
  } catch (e) {
    return { error: `Soubor se nepodařilo převést: ${(e as Error).message}` };
  }

  const db = await getDb();
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(schema.quizzes.sortOrder) })
    .from(schema.quizzes)
    .where(eq(schema.quizzes.topicId, topic.id));
  await db.insert(schema.quizzes).values({
    topicId: topic.id,
    title: quiz.title,
    description: quiz.description ?? null,
    questions: quiz.questions,
    maxAttempts: 1,
    showAnswersAfter: true,
    isOpen: true,
    sortOrder: (maxOrder ?? 0) + 1,
  });
  revalidatePath(`/ucitel/temata/${topic.id}`);
  return { success: `Kvíz „${quiz.title}“ nahrán (${quiz.questions.length} otázek).` };
}
