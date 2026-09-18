"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { clearStudentSession, clearTeacherSession, setStudentSession, setTeacherSession } from "@/lib/auth/session";
import type { ActionState } from "./types";

const PIN_MAX_FAILURES = 5;
const PIN_LOCK_MINUTES = 15;

export async function teacherLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Vyplň e-mail i heslo." };

  const db = await getDb();
  const teacher = await db.query.teachers.findFirst({ where: eq(schema.teachers.email, email) });
  const ok = teacher && (await verifyPassword(password, teacher.passwordHash));
  if (!ok) return { error: "Nesprávný e-mail nebo heslo." };

  await setTeacherSession(teacher.id);
  redirect("/ucitel");
}

export async function teacherLogout() {
  await clearTeacherSession();
  redirect("/ucitel/prihlaseni");
}

export async function studentLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  if (!studentId) return { error: "Vyber své jméno." };
  if (!/^\d{4}$/.test(pin)) return { error: "PIN má 4 číslice." };

  const db = await getDb();
  const student = await db.query.students.findFirst({
    where: and(eq(schema.students.id, studentId), eq(schema.students.classId, classId)),
  });
  if (!student || !student.isActive) return { error: "Student nenalezen." };

  const now = new Date();
  if (student.pinLockedUntil && student.pinLockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((student.pinLockedUntil.getTime() - now.getTime()) / 60000));
    return { error: `Příliš mnoho špatných pokusů. Zkus to znovu za ${minutes} min.` };
  }

  if (student.pin !== pin) {
    const failures = student.pinFailedAttempts + 1;
    const lock = failures >= PIN_MAX_FAILURES;
    await db
      .update(schema.students)
      .set({
        pinFailedAttempts: lock ? 0 : failures,
        pinLockedUntil: lock ? new Date(now.getTime() + PIN_LOCK_MINUTES * 60000) : null,
      })
      .where(eq(schema.students.id, student.id));
    return {
      error: lock
        ? `Špatný PIN. Přihlášení je zamčeno na ${PIN_LOCK_MINUTES} minut.`
        : `Špatný PIN. Zbývá ${PIN_MAX_FAILURES - failures} ${PIN_MAX_FAILURES - failures === 1 ? "pokus" : "pokusy"}.`,
    };
  }

  if (student.pinFailedAttempts > 0 || student.pinLockedUntil) {
    await db
      .update(schema.students)
      .set({ pinFailedAttempts: 0, pinLockedUntil: null })
      .where(eq(schema.students.id, student.id));
  }

  await setStudentSession(student.id, classId);
  redirect(`/trida/${classId}`);
}

export async function studentLogout(formData: FormData) {
  const classId = String(formData.get("classId") ?? "");
  await clearStudentSession();
  redirect(classId ? `/trida/${classId}` : "/");
}
