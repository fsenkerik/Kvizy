"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { requireAdmin, requireTeacher } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { type ActionState, str } from "./types";

const MIN_PASSWORD = 8;

export async function createTeacher(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@")) return { error: "Zadej platný e-mail." };
  if (!name) return { error: "Zadej jméno." };
  if (password.length < MIN_PASSWORD) return { error: `Heslo musí mít alespoň ${MIN_PASSWORD} znaků.` };

  const db = await getDb();
  const exists = await db.query.teachers.findFirst({ where: eq(schema.teachers.email, email) });
  if (exists) return { error: "Učitel s tímto e-mailem už existuje." };

  await db.insert(schema.teachers).values({
    email,
    name,
    passwordHash: await hashPassword(password),
    isAdmin: formData.get("isAdmin") === "on",
  });
  revalidatePath("/ucitel/ucitele");
  return { success: `Účet ${email} vytvořen.` };
}

export async function deleteTeacher(formData: FormData) {
  const admin = await requireAdmin();
  const teacherId = str(formData, "teacherId");
  if (!teacherId || teacherId === admin.id) return;
  const db = await getDb();
  await db.delete(schema.teachers).where(eq(schema.teachers.id, teacherId));
  revalidatePath("/ucitel/ucitele");
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!(await verifyPassword(current, teacher.passwordHash))) return { error: "Současné heslo nesouhlasí." };
  if (next.length < MIN_PASSWORD) return { error: `Nové heslo musí mít alespoň ${MIN_PASSWORD} znaků.` };
  if (next !== confirm) return { error: "Nová hesla se neshodují." };

  const db = await getDb();
  await db.update(schema.teachers).set({ passwordHash: await hashPassword(next) }).where(eq(schema.teachers.id, teacher.id));
  return { success: "Heslo změněno." };
}
