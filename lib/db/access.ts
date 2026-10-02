import { and, eq, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/**
 * Přístup učitele k datům. Učitel má přístup ke skupině, když
 *  - je jejím vlastníkem (groups.teacherId), nebo
 *  - mu ji vlastník nasdílel (group_shares).
 *
 * Role sdílení:
 *  - "edit" = plný přístup kromě smazání skupiny a správy sdílení,
 *  - "view" = jen prohlížení.
 *
 * Funkce `getOwned*` vrací entitu pro čtení (vlastník i sdílený učitel),
 * `requireEditable*` navíc ověří právo na úpravy.
 */

export type Access = { role: "owner" | "edit" | "view"; canEdit: boolean; isOwner: boolean };

export function accessFor(group: { teacherId: string }, teacherId: string, share?: { role: "edit" | "view" } | null): Access | null {
  if (group.teacherId === teacherId) return { role: "owner", canEdit: true, isOwner: true };
  if (!share) return null;
  return { role: share.role, canEdit: share.role === "edit", isOwner: false };
}

/** Sdílení skupiny pro daného učitele (nebo null). */
async function findShare(teacherId: string, groupId: string) {
  const db = await getDb();
  const share = await db.query.groupShares.findFirst({
    where: and(eq(schema.groupShares.groupId, groupId), eq(schema.groupShares.teacherId, teacherId)),
  });
  return share ?? null;
}

/** Přístup ke skupině, nebo null, když učitel nemá právo ji ani vidět. */
export async function getGroupAccess(teacherId: string, group: { id: string; teacherId: string }): Promise<Access | null> {
  if (group.teacherId === teacherId) return { role: "owner", canEdit: true, isOwner: true };
  return accessFor(group, teacherId, await findShare(teacherId, group.id));
}

/** Id skupin, ke kterým má učitel přístup (vlastní + nasdílené). */
export async function accessibleGroupIds(teacherId: string) {
  const db = await getDb();
  const [owned, shared] = await Promise.all([
    db.select({ id: schema.groups.id }).from(schema.groups).where(eq(schema.groups.teacherId, teacherId)),
    db.select({ id: schema.groupShares.groupId }).from(schema.groupShares).where(eq(schema.groupShares.teacherId, teacherId)),
  ]);
  return [...new Set([...owned.map((g) => g.id), ...shared.map((s) => s.id)])];
}

/** Skupiny učitele včetně nasdílených, s informací o přístupu. */
export async function listAccessibleGroups(teacherId: string) {
  const db = await getDb();
  const shares = await db.query.groupShares.findMany({ where: eq(schema.groupShares.teacherId, teacherId) });
  const shareByGroup = new Map(shares.map((s) => [s.groupId, s]));
  const ids = await accessibleGroupIds(teacherId);
  if (ids.length === 0) return [];

  const groups = await db.query.groups.findMany({
    where: inArray(schema.groups.id, ids),
    with: {
      classes: { columns: { id: true, name: true, sortOrder: true } },
      topics: { columns: { id: true } },
      teacher: { columns: { name: true, email: true } },
      shares: { columns: { id: true } },
    },
  });
  return groups
    .map((g) => ({ ...g, access: accessFor(g, teacherId, shareByGroup.get(g.id))! }))
    .sort((a, b) => Number(b.access.isOwner) - Number(a.access.isOwner) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "cs"));
}

/* ---------- Jednotlivé entity ---------- */

export async function getOwnedGroup(teacherId: string, groupId: string) {
  const db = await getDb();
  const group = await db.query.groups.findFirst({
    where: eq(schema.groups.id, groupId),
    with: { teacher: { columns: { id: true, name: true, email: true } } },
  });
  if (!group) return null;
  const access = await getGroupAccess(teacherId, group);
  return access ? Object.assign(group, { access }) : null;
}

export async function getOwnedClass(teacherId: string, classId: string) {
  const db = await getDb();
  const cls = await db.query.classes.findFirst({ where: eq(schema.classes.id, classId), with: { group: true } });
  if (!cls) return null;
  const access = await getGroupAccess(teacherId, cls.group);
  return access ? Object.assign(cls, { access }) : null;
}

export async function getOwnedStudent(teacherId: string, studentId: string) {
  const db = await getDb();
  const student = await db.query.students.findFirst({
    where: eq(schema.students.id, studentId),
    with: { class: { with: { group: true } } },
  });
  if (!student) return null;
  const access = await getGroupAccess(teacherId, student.class.group);
  return access ? Object.assign(student, { access }) : null;
}

export async function getOwnedTopic(teacherId: string, topicId: string) {
  const db = await getDb();
  const topic = await db.query.topics.findFirst({ where: eq(schema.topics.id, topicId), with: { group: true } });
  if (!topic) return null;
  const access = await getGroupAccess(teacherId, topic.group);
  return access ? Object.assign(topic, { access }) : null;
}

export async function getOwnedQuiz(teacherId: string, quizId: string) {
  const db = await getDb();
  const quiz = await db.query.quizzes.findFirst({
    where: eq(schema.quizzes.id, quizId),
    with: { topic: { with: { group: true } } },
  });
  if (!quiz) return null;
  const access = await getGroupAccess(teacherId, quiz.topic.group);
  return access ? Object.assign(quiz, { access }) : null;
}

export async function getOwnedLink(teacherId: string, linkId: string) {
  const db = await getDb();
  const link = await db.query.links.findFirst({
    where: eq(schema.links.id, linkId),
    with: { topic: { with: { group: true } } },
  });
  if (!link) return null;
  const access = await getGroupAccess(teacherId, link.topic.group);
  return access ? Object.assign(link, { access }) : null;
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
  if (!attempt) return null;
  const access = await getGroupAccess(teacherId, attempt.quiz.topic.group);
  return access ? Object.assign(attempt, { access }) : null;
}

/* ---------- Varianty vyžadující právo na úpravy ---------- */

type WithAccess<T> = T & { access: Access };

/** Vrátí entitu jen tehdy, když ji učitel smí upravovat (vlastník nebo sdílení s právem úprav). */
export function editableOnly<T>(entity: WithAccess<T> | null): WithAccess<T> | null {
  return entity && entity.access.canEdit ? entity : null;
}

/** Vrátí entitu jen vlastníkovi (mazání skupiny, správa sdílení). */
export function ownerOnly<T>(entity: WithAccess<T> | null): WithAccess<T> | null {
  return entity && entity.access.isOwner ? entity : null;
}

/* ---------- Sdílení ---------- */

/** Učitelé, kterým je skupina nasdílená (včetně jejich jmen). */
export async function listGroupShares(groupId: string) {
  const db = await getDb();
  return db.query.groupShares.findMany({
    where: eq(schema.groupShares.groupId, groupId),
    with: { teacher: { columns: { id: true, name: true, email: true } } },
  });
}

/** Ostatní učitelé, kterým jde skupina nasdílet (bez vlastníka a bez už nasdílených). */
export async function listShareCandidates(ownerId: string, groupId: string) {
  const db = await getDb();
  const [teachers, shares] = await Promise.all([
    db.query.teachers.findMany({ columns: { id: true, name: true, email: true } }),
    db.query.groupShares.findMany({ where: eq(schema.groupShares.groupId, groupId), columns: { teacherId: true } }),
  ]);
  const taken = new Set([ownerId, ...shares.map((s) => s.teacherId)]);
  return teachers.filter((t) => !taken.has(t.id)).sort((a, b) => a.name.localeCompare(b.name, "cs"));
}

/** Skupiny, které učitel vlastní (pro hromadné sdílení všeho). */
export async function listOwnedGroups(teacherId: string) {
  const db = await getDb();
  return db.query.groups.findMany({ where: eq(schema.groups.teacherId, teacherId) });
}

export { or };
