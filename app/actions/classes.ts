"use server";

import { eq, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getOwnedClass, getOwnedGroup } from "@/lib/db/access";
import { requireTeacher } from "@/lib/auth/guards";
import { type ActionState, str } from "./types";

export async function createClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const group = await getOwnedGroup(teacher.id, str(formData, "groupId"));
  if (!group) return { error: "Skupina nenalezena." };
  const name = str(formData, "name");
  if (!name) return { error: "Zadej název třídy (např. 1.AV)." };

  const db = await getDb();
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(schema.classes.sortOrder) })
    .from(schema.classes)
    .where(eq(schema.classes.groupId, group.id));
  await db.insert(schema.classes).values({ groupId: group.id, name, sortOrder: (maxOrder ?? 0) + 1 });
  revalidatePath(`/ucitel/skupiny/${group.id}`);
  revalidatePath("/");
  return { success: "Třída přidána." };
}

export async function renameClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const cls = await getOwnedClass(teacher.id, str(formData, "classId"));
  if (!cls) return { error: "Třída nenalezena." };
  const name = str(formData, "name");
  if (!name) return { error: "Zadej název třídy." };

  const db = await getDb();
  await db.update(schema.classes).set({ name }).where(eq(schema.classes.id, cls.id));
  revalidatePath(`/ucitel/skupiny/${cls.groupId}`);
  revalidatePath(`/ucitel/tridy/${cls.id}`);
  revalidatePath("/");
  return { success: "Přejmenováno." };
}

export async function deleteClass(formData: FormData) {
  const teacher = await requireTeacher();
  const cls = await getOwnedClass(teacher.id, str(formData, "classId"));
  if (!cls) return;
  const db = await getDb();
  await db.delete(schema.classes).where(eq(schema.classes.id, cls.id));
  revalidatePath(`/ucitel/skupiny/${cls.groupId}`);
  revalidatePath("/");
  redirect(`/ucitel/skupiny/${cls.groupId}`);
}
