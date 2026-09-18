"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getOwnedClass, getOwnedStudent } from "@/lib/db/access";
import { requireTeacher } from "@/lib/auth/guards";
import { newPin } from "@/lib/ids";
import { type ActionState, str } from "./types";

/** Rozdělí řádek „Jan Novák“ / „Novák Jan“ (příjmení bereme jako poslední slovo). */
function splitName(line: string) {
  const parts = line.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

/** PIN unikátní v rámci třídy, aby dvojice jméno+PIN byla jednoznačná i při shodě jmen. */
function uniquePin(taken: Set<string>) {
  let pin = newPin();
  while (taken.has(pin)) pin = newPin();
  taken.add(pin);
  return pin;
}

export async function addStudents(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const cls = await getOwnedClass(teacher.id, str(formData, "classId"));
  if (!cls) return { error: "Třída nenalezena." };

  const lines = str(formData, "names")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: "Vlož alespoň jedno jméno (každé na vlastní řádek)." };

  const db = await getDb();
  const existing = await db.query.students.findMany({ where: eq(schema.students.classId, cls.id) });
  const taken = new Set(existing.map((s) => s.pin));
  const values = lines.map((line) => ({ classId: cls.id, ...splitName(line), pin: uniquePin(taken) }));
  await db.insert(schema.students).values(values);

  revalidatePath(`/ucitel/tridy/${cls.id}`);
  return { success: `Přidáno ${values.length} studentů.` };
}

export async function renameStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const student = await getOwnedStudent(teacher.id, str(formData, "studentId"));
  if (!student) return { error: "Student nenalezen." };
  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  if (!firstName) return { error: "Zadej jméno." };

  const db = await getDb();
  await db.update(schema.students).set({ firstName, lastName }).where(eq(schema.students.id, student.id));
  revalidatePath(`/ucitel/tridy/${student.classId}`);
  return { success: "Uloženo." };
}

export async function regeneratePin(formData: FormData) {
  const teacher = await requireTeacher();
  const student = await getOwnedStudent(teacher.id, str(formData, "studentId"));
  if (!student) return;
  const db = await getDb();
  const siblings = await db.query.students.findMany({ where: eq(schema.students.classId, student.classId) });
  const taken = new Set(siblings.filter((s) => s.id !== student.id).map((s) => s.pin));
  await db
    .update(schema.students)
    .set({ pin: uniquePin(taken), pinFailedAttempts: 0, pinLockedUntil: null })
    .where(eq(schema.students.id, student.id));
  revalidatePath(`/ucitel/tridy/${student.classId}`);
}

export async function toggleStudentActive(formData: FormData) {
  const teacher = await requireTeacher();
  const student = await getOwnedStudent(teacher.id, str(formData, "studentId"));
  if (!student) return;
  const db = await getDb();
  await db.update(schema.students).set({ isActive: !student.isActive }).where(eq(schema.students.id, student.id));
  revalidatePath(`/ucitel/tridy/${student.classId}`);
}

export async function deleteStudent(formData: FormData) {
  const teacher = await requireTeacher();
  const student = await getOwnedStudent(teacher.id, str(formData, "studentId"));
  if (!student) return;
  const db = await getDb();
  await db.delete(schema.students).where(eq(schema.students.id, student.id));
  revalidatePath(`/ucitel/tridy/${student.classId}`);
}
