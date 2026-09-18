import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/**
 * Načtení entit s kontrolou, že patří přihlášenému učiteli.
 * Každá funkce vrací null, pokud entita neexistuje nebo patří jinému učiteli.
 */

export async function getOwnedGroup(teacherId: string, groupId: string) {
  const db = await getDb();
  const group = await db.query.groups.findFirst({
    where: and(eq(schema.groups.id, groupId), eq(schema.groups.teacherId, teacherId)),
  });
  return group ?? null;
}

export async function getOwnedClass(teacherId: string, classId: string) {
  const db = await getDb();
  const cls = await db.query.classes.findFirst({
    where: eq(schema.classes.id, classId),
    with: { group: true },
  });
  if (!cls || cls.group.teacherId !== teacherId) return null;
  return cls;
}

export async function getOwnedStudent(teacherId: string, studentId: string) {
  const db = await getDb();
  const student = await db.query.students.findFirst({
    where: eq(schema.students.id, studentId),
    with: { class: { with: { group: true } } },
  });
  if (!student || student.class.group.teacherId !== teacherId) return null;
  return student;
}

export async function getOwnedTopic(teacherId: string, topicId: string) {
  const db = await getDb();
  const topic = await db.query.topics.findFirst({
    where: eq(schema.topics.id, topicId),
    with: { group: true },
  });
  if (!topic || topic.group.teacherId !== teacherId) return null;
  return topic;
}

export async function getOwnedQuiz(teacherId: string, quizId: string) {
  const db = await getDb();
  const quiz = await db.query.quizzes.findFirst({
    where: eq(schema.quizzes.id, quizId),
    with: { topic: { with: { group: true } } },
  });
  if (!quiz || quiz.topic.group.teacherId !== teacherId) return null;
  return quiz;
}

export async function getOwnedLink(teacherId: string, linkId: string) {
  const db = await getDb();
  const link = await db.query.links.findFirst({
    where: eq(schema.links.id, linkId),
    with: { topic: { with: { group: true } } },
  });
  if (!link || link.topic.group.teacherId !== teacherId) return null;
  return link;
}

export async function getOwnedAttempt(teacherId: string, attemptId: string) {
  const db = await getDb();
  const attempt = await db.query.attempts.findFirst({
    where: eq(schema.attempts.id, attemptId),
    with: {
      quiz: { with: { topic: { with: { group: true } } } },
      student: { with: { class: true } },
    },
  });
  if (!attempt || attempt.quiz.topic.group.teacherId !== teacherId) return null;
  return attempt;
}
