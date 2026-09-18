import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/** Souhrn pokusů jednoho studenta u jednoho kvízu. */
export type AttemptSummary = {
  count: number;
  best: { score: number; maxScore: number; percent: number } | null;
  lastAttemptId: string | null;
};

/** Témata skupiny viditelná pro studenta včetně otevřených kvízů, odkazů a souhrnu jeho pokusů. */
export async function getStudentTopics(groupId: string, studentId: string) {
  const db = await getDb();
  const topics = await db.query.topics.findMany({
    where: and(eq(schema.topics.groupId, groupId), eq(schema.topics.isVisible, true)),
    orderBy: [asc(schema.topics.sortOrder), asc(schema.topics.createdAt)],
    with: {
      quizzes: {
        where: eq(schema.quizzes.isOpen, true),
        orderBy: [asc(schema.quizzes.sortOrder), asc(schema.quizzes.createdAt)],
        columns: { id: true, title: true, description: true, questions: true, maxAttempts: true, showAnswersAfter: true, points: true },
      },
      links: { orderBy: [asc(schema.links.sortOrder), asc(schema.links.createdAt)] },
    },
  });

  const quizIds = topics.flatMap((t) => t.quizzes.map((q) => q.id));
  const linkIds = topics.flatMap((t) => t.links.map((l) => l.id));
  const [attempts, events, visits] = await Promise.all([
    quizIds.length
      ? db.query.attempts.findMany({
          where: and(eq(schema.attempts.studentId, studentId), inArray(schema.attempts.quizId, quizIds)),
          orderBy: [desc(schema.attempts.submittedAt)],
          columns: { id: true, quizId: true, score: true, maxScore: true, percent: true },
        })
      : [],
    db.query.pointEvents.findMany({ where: eq(schema.pointEvents.studentId, studentId), columns: { sourceKey: true, points: true } }),
    linkIds.length
      ? db.query.linkVisits.findMany({
          where: and(eq(schema.linkVisits.studentId, studentId), inArray(schema.linkVisits.linkId, linkIds)),
          columns: { linkId: true, completedAt: true },
        })
      : [],
  ]);
  const pointsBySource = new Map(events.map((e) => [e.sourceKey, e.points]));
  const completedLinks = new Set(visits.filter((v) => v.completedAt).map((v) => v.linkId));

  const summaries = new Map<string, AttemptSummary>();
  for (const a of attempts) {
    const s = summaries.get(a.quizId) ?? { count: 0, best: null, lastAttemptId: null };
    s.count++;
    if (!s.lastAttemptId) s.lastAttemptId = a.id;
    if (!s.best || a.percent > s.best.percent) s.best = { score: a.score, maxScore: a.maxScore, percent: a.percent };
    summaries.set(a.quizId, s);
  }

  return topics.map((t) => ({
    ...t,
    quizzes: t.quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      questionCount: q.questions.length,
      maxAttempts: q.maxAttempts,
      showAnswersAfter: q.showAnswersAfter,
      points: q.points,
      /** Body aktuálně získané z tohoto kvízu (podle posledního pokusu). */
      earnedPoints: pointsBySource.get(`quiz:${q.id}`) ?? null,
      summary: summaries.get(q.id) ?? { count: 0, best: null, lastAttemptId: null },
    })),
    links: t.links.map((l) => ({ ...l, completed: completedLinks.has(l.id) })),
  }));
}

/** Kvíz pro studenta – ověří, že patří do jeho skupiny a je otevřený. */
export async function getQuizForStudent(quizId: string, groupId: string) {
  const db = await getDb();
  const quiz = await db.query.quizzes.findFirst({
    where: eq(schema.quizzes.id, quizId),
    with: { topic: true },
  });
  if (!quiz || quiz.topic.groupId !== groupId || !quiz.isOpen || !quiz.topic.isVisible) return null;
  return quiz;
}

export async function countStudentAttempts(quizId: string, studentId: string) {
  const db = await getDb();
  const rows = await db.query.attempts.findMany({
    where: and(eq(schema.attempts.quizId, quizId), eq(schema.attempts.studentId, studentId)),
    columns: { id: true },
  });
  return rows.length;
}
