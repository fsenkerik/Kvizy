"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getOwnedGroup, listOwnedGroups, ownerOnly } from "@/lib/db/access";
import { requireTeacher } from "@/lib/auth/guards";
import { type ActionState, str } from "./types";

function parseRole(value: string): "edit" | "view" {
  return value === "view" ? "view" : "edit";
}

/** Nasdílí skupinu dalšímu učiteli (jen vlastník). */
export async function shareGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const group = ownerOnly(await getOwnedGroup(teacher.id, str(formData, "groupId")));
  if (!group) return { error: "Sdílení může nastavit jen vlastník skupiny." };

  const targetId = str(formData, "teacherId");
  if (!targetId) return { error: "Vyber učitele." };
  if (targetId === teacher.id) return { error: "Skupina už je tvoje." };

  const db = await getDb();
  const target = await db.query.teachers.findFirst({ where: eq(schema.teachers.id, targetId) });
  if (!target) return { error: "Učitel nenalezen." };

  await db
    .insert(schema.groupShares)
    .values({ groupId: group.id, teacherId: target.id, role: parseRole(str(formData, "role")) })
    .onConflictDoUpdate({
      target: [schema.groupShares.groupId, schema.groupShares.teacherId],
      set: { role: parseRole(str(formData, "role")) },
    });

  revalidatePath(`/ucitel/skupiny/${group.id}`);
  revalidatePath("/ucitel");
  return { success: `Skupina nasdílena učiteli ${target.name}.` };
}

/** Změna role existujícího sdílení. */
export async function updateShareRole(formData: FormData) {
  const teacher = await requireTeacher();
  const group = ownerOnly(await getOwnedGroup(teacher.id, str(formData, "groupId")));
  if (!group) return;
  const db = await getDb();
  await db
    .update(schema.groupShares)
    .set({ role: parseRole(str(formData, "role")) })
    .where(and(eq(schema.groupShares.groupId, group.id), eq(schema.groupShares.teacherId, str(formData, "teacherId"))));
  revalidatePath(`/ucitel/skupiny/${group.id}`);
}

/** Zruší sdílení (vlastník kdykoli, nebo si ho může zrušit sám sdílený učitel). */
export async function unshareGroup(formData: FormData) {
  const teacher = await requireTeacher();
  const groupId = str(formData, "groupId");
  const targetId = str(formData, "teacherId") || teacher.id;

  const group = await getOwnedGroup(teacher.id, groupId);
  if (!group) return;
  // Odebrat cizí přístup smí jen vlastník; sobě ho může zrušit kdokoli.
  if (!group.access.isOwner && targetId !== teacher.id) return;

  const db = await getDb();
  await db
    .delete(schema.groupShares)
    .where(and(eq(schema.groupShares.groupId, groupId), eq(schema.groupShares.teacherId, targetId)));
  revalidatePath(`/ucitel/skupiny/${groupId}`);
  revalidatePath("/ucitel");
}

/** Nasdílí kolegovi všechny skupiny, které učitel vlastní. */
export async function shareAllGroups(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const targetId = str(formData, "teacherId");
  if (!targetId || targetId === teacher.id) return { error: "Vyber kolegu, kterému chceš sdílet." };

  const db = await getDb();
  const target = await db.query.teachers.findFirst({ where: eq(schema.teachers.id, targetId) });
  if (!target) return { error: "Učitel nenalezen." };

  const groups = await listOwnedGroups(teacher.id);
  if (groups.length === 0) return { error: "Nemáš žádnou vlastní skupinu ke sdílení." };

  const role = parseRole(str(formData, "role"));
  await db
    .insert(schema.groupShares)
    .values(groups.map((g) => ({ groupId: g.id, teacherId: target.id, role })))
    .onConflictDoUpdate({ target: [schema.groupShares.groupId, schema.groupShares.teacherId], set: { role } });

  revalidatePath("/ucitel");
  revalidatePath("/ucitel/ucitele");
  return { success: `Nasdíleno ${groups.length} skupin učiteli ${target.name}.` };
}

/** Zruší sdílení všech mých skupin danému učiteli. */
export async function unshareAllGroups(formData: FormData) {
  const teacher = await requireTeacher();
  const targetId = str(formData, "teacherId");
  if (!targetId) return;

  const db = await getDb();
  const groups = await listOwnedGroups(teacher.id);
  for (const g of groups) {
    await db.delete(schema.groupShares).where(and(eq(schema.groupShares.groupId, g.id), eq(schema.groupShares.teacherId, targetId)));
  }
  revalidatePath("/ucitel");
  revalidatePath("/ucitel/ucitele");
}
