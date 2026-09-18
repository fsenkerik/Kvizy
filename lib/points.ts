import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/**
 * Bodování pro studenty.
 *  - Kvíz: body = procenta z posledního (nejnovějšího) pokusu × body kvízu (při 100 %).
 *  - Odkaz: pevný počet bodů po otevření odkazu a setrvání LINK_WAIT_SECONDS.
 *  - Vše se vede v tabulce point_events (jeden řádek na student × zdroj), takže body
 *    přežijí skrytí i smazání kvízu.
 */

export const LINK_WAIT_SECONDS = 45;

/** Body za kvíz z procent – zaokrouhleno na celé body. */
export function quizPoints(percent: number, maxPoints: number) {
  if (maxPoints <= 0) return 0;
  return Math.round((Math.max(0, Math.min(100, percent)) / 100) * maxPoints);
}

export type PointsSummary = {
  /** Celkem nasbírané body. */
  total: number;
  /** Momentálně dosažitelné maximum (viditelné kvízy a odkazy + zdroje, ze kterých už student body má). */
  max: number;
};

async function upsertEvent(studentId: string, sourceKey: string, values: { quizId?: string | null; linkId?: string | null; label: string; points: number }) {
  const db = await getDb();
  await db
    .insert(schema.pointEvents)
    .values({ studentId, sourceKey, quizId: values.quizId ?? null, linkId: values.linkId ?? null, label: values.label, points: values.points })
    .onConflictDoUpdate({
      target: [schema.pointEvents.studentId, schema.pointEvents.sourceKey],
      set: { points: values.points, label: values.label, quizId: values.quizId ?? null, linkId: values.linkId ?? null, updatedAt: new Date() },
    });
}

/**
 * Přepočítá body studenta za kvíz podle jeho posledního pokusu.
 * Bez pokusů záznam smaže (např. po smazání pokusů učitelem).
 */
export async function syncQuizPoints(studentId: string, quiz: { id: string; title: string; points: number }) {
  const db = await getDb();
  const last = await db.query.attempts.findFirst({
    where: and(eq(schema.attempts.quizId, quiz.id), eq(schema.attempts.studentId, studentId)),
    orderBy: [desc(schema.attempts.submittedAt), desc(schema.attempts.attemptNumber)],
    columns: { percent: true },
  });
  const sourceKey = `quiz:${quiz.id}`;
  if (!last) {
    await db.delete(schema.pointEvents).where(and(eq(schema.pointEvents.studentId, studentId), eq(schema.pointEvents.sourceKey, sourceKey)));
    return 0;
  }
  const points = quizPoints(last.percent, quiz.points);
  await upsertEvent(studentId, sourceKey, { quizId: quiz.id, label: quiz.title, points });
  return points;
}

/** Přepočítá body za kvíz všem studentům, kteří u něj mají záznam nebo pokus (po hromadném mazání pokusů / změně bodů). */
export async function syncQuizPointsForAll(quiz: { id: string; title: string; points: number }) {
  const db = await getDb();
  const [fromAttempts, fromEvents] = await Promise.all([
    db.selectDistinct({ studentId: schema.attempts.studentId }).from(schema.attempts).where(eq(schema.attempts.quizId, quiz.id)),
    db.select({ studentId: schema.pointEvents.studentId }).from(schema.pointEvents).where(eq(schema.pointEvents.sourceKey, `quiz:${quiz.id}`)),
  ]);
  const ids = new Set([...fromAttempts, ...fromEvents].map((r) => r.studentId));
  for (const studentId of ids) await syncQuizPoints(studentId, quiz);
}

export async function awardLinkPoints(studentId: string, link: { id: string; title: string; points: number }) {
  await upsertEvent(studentId, `link:${link.id}`, { linkId: link.id, label: link.title, points: link.points });
  return link.points;
}

export async function getStudentTotal(studentId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.pointEvents.points}), 0)::int` })
    .from(schema.pointEvents)
    .where(eq(schema.pointEvents.studentId, studentId));
  return row?.total ?? 0;
}

/** Souhrn pro hlavičku studenta: celkem bodů a momentálně dosažitelné maximum. */
export async function getPointsSummary(studentId: string, groupId: string): Promise<PointsSummary> {
  const db = await getDb();
  const [topics, events] = await Promise.all([
    db.query.topics.findMany({
      where: eq(schema.topics.groupId, groupId),
      columns: { id: true, isVisible: true },
      with: {
        quizzes: { columns: { id: true, points: true, isOpen: true } },
        links: { columns: { id: true, points: true } },
      },
    }),
    db.query.pointEvents.findMany({ where: eq(schema.pointEvents.studentId, studentId) }),
  ]);

  // Dosažitelné zdroje: otevřené kvízy a odkazy ve viditelných tématech.
  const available = new Map<string, number>();
  const knownMax = new Map<string, number>();
  for (const t of topics) {
    for (const q of t.quizzes) {
      knownMax.set(`quiz:${q.id}`, q.points);
      if (t.isVisible && q.isOpen) available.set(`quiz:${q.id}`, q.points);
    }
    for (const l of t.links) {
      knownMax.set(`link:${l.id}`, l.points);
      if (t.isVisible && l.points > 0) available.set(`link:${l.id}`, l.points);
    }
  }

  let total = 0;
  let max = 0;
  for (const [, pts] of available) max += pts;
  for (const e of events) {
    total += e.points;
    if (!available.has(e.sourceKey)) {
      // Skrytý nebo smazaný zdroj: do maxima počítáme jeho plný počet bodů, pokud ho známe, jinak to, co student získal.
      max += Math.max(knownMax.get(e.sourceKey) ?? 0, e.points);
    }
  }
  return { total, max };
}

/** Součty bodů více studentů (pro učitelské přehledy). */
export async function getTotalsForStudents(studentIds: string[]) {
  const totals = new Map<string, number>();
  if (studentIds.length === 0) return totals;
  const db = await getDb();
  const rows = await db
    .select({ studentId: schema.pointEvents.studentId, total: sql<number>`sum(${schema.pointEvents.points})::int` })
    .from(schema.pointEvents)
    .where(inArray(schema.pointEvents.studentId, studentIds))
    .groupBy(schema.pointEvents.studentId);
  for (const r of rows) totals.set(r.studentId, r.total);
  return totals;
}

/** Bodová historie studenta (pro učitele i studenta). */
export async function getPointHistory(studentId: string) {
  const db = await getDb();
  return db.query.pointEvents.findMany({
    where: eq(schema.pointEvents.studentId, studentId),
    orderBy: [asc(schema.pointEvents.createdAt)],
  });
}
