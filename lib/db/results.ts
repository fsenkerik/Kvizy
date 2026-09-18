import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export type StudentQuizStat = {
  count: number;
  best: { attemptId: string; score: number; maxScore: number; percent: number } | null;
  last: { attemptId: string; score: number; maxScore: number; percent: number; submittedAt: Date } | null;
};

/** Sloučí pokusy do souhrnu per (studentId, quizId). */
export function summarize(attempts: { id: string; quizId: string; studentId: string; score: number; maxScore: number; percent: number; submittedAt: Date }[]) {
  const map = new Map<string, StudentQuizStat>();
  for (const a of attempts) {
    const key = `${a.studentId}:${a.quizId}`;
    const s = map.get(key) ?? { count: 0, best: null, last: null };
    s.count++;
    if (!s.best || a.percent > s.best.percent) s.best = { attemptId: a.id, score: a.score, maxScore: a.maxScore, percent: a.percent };
    if (!s.last || a.submittedAt > s.last.submittedAt) s.last = { attemptId: a.id, score: a.score, maxScore: a.maxScore, percent: a.percent, submittedAt: a.submittedAt };
    map.set(key, s);
  }
  return map;
}

export function statFor(map: Map<string, StudentQuizStat>, studentId: string, quizId: string): StudentQuizStat {
  return map.get(`${studentId}:${quizId}`) ?? { count: 0, best: null, last: null };
}

/** Všechny kvízy skupiny (přes témata) v pořadí témat a kvízů. */
export async function getGroupQuizzes(groupId: string) {
  const db = await getDb();
  const topics = await db.query.topics.findMany({
    where: eq(schema.topics.groupId, groupId),
    orderBy: [asc(schema.topics.sortOrder), asc(schema.topics.createdAt)],
    with: {
      quizzes: {
        orderBy: [asc(schema.quizzes.sortOrder), asc(schema.quizzes.createdAt)],
        columns: { id: true, title: true, isOpen: true },
      },
    },
  });
  return topics.flatMap((t) => t.quizzes.map((q) => ({ ...q, topicTitle: t.title, weekNumber: t.weekNumber })));
}

/** Matice třída × kvízy skupiny. */
export async function getClassResults(classId: string, groupId: string) {
  const db = await getDb();
  const [students, quizzes] = await Promise.all([
    db.query.students.findMany({
      where: eq(schema.students.classId, classId),
      orderBy: [asc(schema.students.lastName), asc(schema.students.firstName)],
    }),
    getGroupQuizzes(groupId),
  ]);
  const studentIds = students.map((s) => s.id);
  const quizIds = quizzes.map((q) => q.id);
  const attempts =
    studentIds.length && quizIds.length
      ? await db.query.attempts.findMany({
          where: and(inArray(schema.attempts.studentId, studentIds), inArray(schema.attempts.quizId, quizIds)),
        })
      : [];
  return { students, quizzes, stats: summarize(attempts) };
}

/** Výsledky jednoho kvízu napříč třídami skupiny. */
export async function getQuizResults(quizId: string, groupId: string) {
  const db = await getDb();
  const classes = await db.query.classes.findMany({
    where: eq(schema.classes.groupId, groupId),
    orderBy: [asc(schema.classes.sortOrder), asc(schema.classes.createdAt)],
    with: { students: { orderBy: [asc(schema.students.lastName), asc(schema.students.firstName)] } },
  });
  const attempts = await db.query.attempts.findMany({
    where: eq(schema.attempts.quizId, quizId),
    orderBy: [desc(schema.attempts.submittedAt)],
  });
  return { classes, stats: summarize(attempts), attempts };
}
