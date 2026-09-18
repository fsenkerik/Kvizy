"use server";

import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { currentStudent } from "@/lib/auth/guards";
import { awardLinkPoints, getPointsSummary, LINK_WAIT_SECONDS, type PointsSummary } from "@/lib/points";

/** Malá tolerance na zpoždění klienta (časovač 45 s vs. síť). */
const TOLERANCE_MS = 2000;

type LinkContext =
  | { error: string }
  | { error?: undefined; student: NonNullable<Awaited<ReturnType<typeof currentStudent>>>; link: schema.Link; db: Awaited<ReturnType<typeof getDb>> };

async function studentLink(linkId: string): Promise<LinkContext> {
  const student = await currentStudent();
  if (!student) return { error: "Nejsi přihlášený/á." };
  const db = await getDb();
  const link = await db.query.links.findFirst({ where: eq(schema.links.id, linkId), with: { topic: true } });
  if (!link || link.topic.groupId !== student.class.groupId || !link.topic.isVisible) return { error: "Odkaz nenalezen." };
  return { student, link, db };
}

export type StartLinkResult = { ok: false; error: string } | { ok: true; completed: boolean; waitSeconds: number };

/** Student klikl na odkaz – zaznamená čas kliknutí (pokud už není splněno). */
export async function startLinkVisit(linkId: string): Promise<StartLinkResult> {
  const ctx = await studentLink(linkId);
  if (ctx.error !== undefined) return { ok: false, error: ctx.error };
  const { student, link, db } = ctx;

  const existing = await db.query.linkVisits.findFirst({
    where: and(eq(schema.linkVisits.linkId, link.id), eq(schema.linkVisits.studentId, student.id)),
  });
  if (existing?.completedAt) return { ok: true, completed: true, waitSeconds: 0 };

  if (existing) {
    await db.update(schema.linkVisits).set({ clickedAt: new Date() }).where(eq(schema.linkVisits.id, existing.id));
  } else {
    await db.insert(schema.linkVisits).values({ linkId: link.id, studentId: student.id });
  }
  return { ok: true, completed: false, waitSeconds: LINK_WAIT_SECONDS };
}

export type CompleteLinkResult =
  | { ok: false; error: string }
  | { ok: true; alreadyCompleted: boolean; earned: number; points: PointsSummary };

/** Po uplynutí čekací doby klient požádá o body; server čas ověří podle clickedAt. */
export async function completeLinkVisit(linkId: string): Promise<CompleteLinkResult> {
  const ctx = await studentLink(linkId);
  if (ctx.error !== undefined) return { ok: false, error: ctx.error };
  const { student, link, db } = ctx;

  const visit = await db.query.linkVisits.findFirst({
    where: and(eq(schema.linkVisits.linkId, link.id), eq(schema.linkVisits.studentId, student.id)),
  });
  if (!visit) return { ok: false, error: "Nejdřív odkaz otevři." };
  if (visit.completedAt) {
    return { ok: true, alreadyCompleted: true, earned: 0, points: await getPointsSummary(student.id, student.class.groupId) };
  }
  const elapsed = Date.now() - visit.clickedAt.getTime();
  if (elapsed < LINK_WAIT_SECONDS * 1000 - TOLERANCE_MS) {
    return { ok: false, error: "Ještě chvíli vydrž – body se přičtou po uplynutí času." };
  }

  await db.update(schema.linkVisits).set({ completedAt: new Date() }).where(eq(schema.linkVisits.id, visit.id));
  const earned = link.points > 0 ? await awardLinkPoints(student.id, link) : 0;
  return { ok: true, alreadyCompleted: false, earned, points: await getPointsSummary(student.id, student.class.groupId) };
}
