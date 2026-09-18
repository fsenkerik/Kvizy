import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getStudentSession, getTeacherSession } from "./session";

/** Přihlášený učitel (řádek z DB) nebo null. Cache = jeden dotaz na request. */
export const currentTeacher = cache(async () => {
  const session = await getTeacherSession();
  if (!session) return null;
  const db = await getDb();
  const teacher = await db.query.teachers.findFirst({ where: eq(schema.teachers.id, session.tid) });
  return teacher ?? null;
});

/** Vyžaduje přihlášeného učitele, jinak přesměruje na přihlášení. */
export async function requireTeacher() {
  const teacher = await currentTeacher();
  if (!teacher) redirect("/ucitel/prihlaseni");
  return teacher;
}

export async function requireAdmin() {
  const teacher = await requireTeacher();
  if (!teacher.isAdmin) redirect("/ucitel");
  return teacher;
}

/** Přihlášený student včetně třídy a skupiny, nebo null. */
export const currentStudent = cache(async () => {
  const session = await getStudentSession();
  if (!session) return null;
  const db = await getDb();
  const student = await db.query.students.findFirst({
    where: eq(schema.students.id, session.sid),
    with: { class: { with: { group: true } } },
  });
  if (!student || !student.isActive || student.classId !== session.cid) return null;
  return student;
});

/** Vyžaduje studenta přihlášeného do dané třídy, jinak přesměruje na přihlášení do třídy. */
export async function requireStudent(classId: string) {
  const student = await currentStudent();
  if (!student || student.classId !== classId) redirect(`/trida/${classId}`);
  return student;
}
