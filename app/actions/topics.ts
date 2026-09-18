"use server";

import { and, asc, eq, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getOwnedGroup, getOwnedTopic } from "@/lib/db/access";
import { requireTeacher } from "@/lib/auth/guards";
import { type ActionState, intOrNull, str } from "./types";

export async function createTopic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const group = await getOwnedGroup(teacher.id, str(formData, "groupId"));
  if (!group) return { error: "Skupina nenalezena." };
  const title = str(formData, "title");
  if (!title) return { error: "Zadej název tématu." };

  const db = await getDb();
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(schema.topics.sortOrder) })
    .from(schema.topics)
    .where(eq(schema.topics.groupId, group.id));
  const [topic] = await db
    .insert(schema.topics)
    .values({
      groupId: group.id,
      title,
      weekNumber: intOrNull(formData, "weekNumber"),
      description: str(formData, "description") || null,
      sortOrder: (maxOrder ?? 0) + 1,
    })
    .returning();
  revalidatePath(`/ucitel/skupiny/${group.id}`);
  redirect(`/ucitel/temata/${topic.id}`);
}

export async function updateTopic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const topic = await getOwnedTopic(teacher.id, str(formData, "topicId"));
  if (!topic) return { error: "Téma nenalezeno." };
  const title = str(formData, "title");
  if (!title) return { error: "Zadej název tématu." };

  const db = await getDb();
  await db
    .update(schema.topics)
    .set({ title, weekNumber: intOrNull(formData, "weekNumber"), description: str(formData, "description") || null })
    .where(eq(schema.topics.id, topic.id));
  revalidatePath(`/ucitel/temata/${topic.id}`);
  revalidatePath(`/ucitel/skupiny/${topic.groupId}`);
  return { success: "Uloženo." };
}

export async function toggleTopicVisible(formData: FormData) {
  const teacher = await requireTeacher();
  const topic = await getOwnedTopic(teacher.id, str(formData, "topicId"));
  if (!topic) return;
  const db = await getDb();
  await db.update(schema.topics).set({ isVisible: !topic.isVisible }).where(eq(schema.topics.id, topic.id));
  revalidatePath(`/ucitel/skupiny/${topic.groupId}`);
  revalidatePath(`/ucitel/temata/${topic.id}`);
}

/** Posune téma o jedno nahoru/dolů v rámci skupiny (prohodí sortOrder se sousedem). */
export async function moveTopic(formData: FormData) {
  const teacher = await requireTeacher();
  const topic = await getOwnedTopic(teacher.id, str(formData, "topicId"));
  if (!topic) return;
  const direction = str(formData, "direction") === "up" ? -1 : 1;

  const db = await getDb();
  const siblings = await db.query.topics.findMany({
    where: eq(schema.topics.groupId, topic.groupId),
    orderBy: [asc(schema.topics.sortOrder), asc(schema.topics.createdAt)],
  });
  const index = siblings.findIndex((t) => t.id === topic.id);
  const other = siblings[index + direction];
  if (!other) return;

  // Normalizujeme pořadí na 1..n, aby prohození fungovalo i při shodných hodnotách.
  const reordered = siblings.map((t, i) => ({ id: t.id, order: i + 1 }));
  const a = reordered[index];
  const b = reordered[index + direction];
  [a.order, b.order] = [b.order, a.order];
  for (const r of reordered) {
    await db.update(schema.topics).set({ sortOrder: r.order }).where(and(eq(schema.topics.id, r.id)));
  }
  revalidatePath(`/ucitel/skupiny/${topic.groupId}`);
}

export async function deleteTopic(formData: FormData) {
  const teacher = await requireTeacher();
  const topic = await getOwnedTopic(teacher.id, str(formData, "topicId"));
  if (!topic) return;
  const db = await getDb();
  await db.delete(schema.topics).where(eq(schema.topics.id, topic.id));
  revalidatePath(`/ucitel/skupiny/${topic.groupId}`);
  redirect(`/ucitel/skupiny/${topic.groupId}`);
}
