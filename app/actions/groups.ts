"use server";

import { eq, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getOwnedGroup } from "@/lib/db/access";
import { requireTeacher } from "@/lib/auth/guards";
import { type ActionState, str } from "./types";

function parseLevel(v: string): "nizsi" | "vyssi" | null {
  return v === "nizsi" || v === "vyssi" ? v : null;
}

export async function createGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const name = str(formData, "name");
  const level = parseLevel(str(formData, "level"));
  if (!name) return { error: "Zadej název skupiny." };
  if (!level) return { error: "Vyber úroveň." };

  const db = await getDb();
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(schema.groups.sortOrder) })
    .from(schema.groups)
    .where(eq(schema.groups.teacherId, teacher.id));
  const [group] = await db
    .insert(schema.groups)
    .values({ teacherId: teacher.id, name, level, sortOrder: (maxOrder ?? 0) + 1 })
    .returning();
  redirect(`/ucitel/skupiny/${group.id}`);
}

export async function updateGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const group = await getOwnedGroup(teacher.id, str(formData, "groupId"));
  if (!group) return { error: "Skupina nenalezena." };
  const name = str(formData, "name");
  const level = parseLevel(str(formData, "level"));
  if (!name || !level) return { error: "Zadej název i úroveň." };

  const db = await getDb();
  await db.update(schema.groups).set({ name, level }).where(eq(schema.groups.id, group.id));
  revalidatePath(`/ucitel/skupiny/${group.id}`);
  revalidatePath("/ucitel");
  return { success: "Uloženo." };
}

export async function deleteGroup(formData: FormData) {
  const teacher = await requireTeacher();
  const group = await getOwnedGroup(teacher.id, str(formData, "groupId"));
  if (!group) return;
  const db = await getDb();
  await db.delete(schema.groups).where(eq(schema.groups.id, group.id));
  revalidatePath("/ucitel");
  redirect("/ucitel");
}
