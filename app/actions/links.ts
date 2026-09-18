"use server";

import { eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { getOwnedLink, getOwnedTopic } from "@/lib/db/access";
import { requireTeacher } from "@/lib/auth/guards";
import { type ActionState, intOrNull, str } from "./types";

function parsePoints(formData: FormData): number | { error: string } {
  const points = intOrNull(formData, "points") ?? 0;
  if (points < 0 || points > 1000) return { error: "Body za odkaz musí být číslo 0–1000." };
  return points;
}

function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return null;
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

export async function createLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const topic = await getOwnedTopic(teacher.id, str(formData, "topicId"));
  if (!topic) return { error: "Téma nenalezeno." };
  const title = str(formData, "title");
  const url = normalizeUrl(str(formData, "url"));
  if (!title) return { error: "Zadej název odkazu." };
  if (!url) return { error: "Zadej platnou adresu (URL)." };
  const points = parsePoints(formData);
  if (typeof points !== "number") return points;

  const db = await getDb();
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(schema.links.sortOrder) })
    .from(schema.links)
    .where(eq(schema.links.topicId, topic.id));
  await db.insert(schema.links).values({
    topicId: topic.id,
    title,
    url,
    description: str(formData, "description") || null,
    points,
    sortOrder: (maxOrder ?? 0) + 1,
  });
  revalidatePath(`/ucitel/temata/${topic.id}`);
  return { success: "Odkaz přidán." };
}

export async function updateLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teacher = await requireTeacher();
  const link = await getOwnedLink(teacher.id, str(formData, "linkId"));
  if (!link) return { error: "Odkaz nenalezen." };
  const title = str(formData, "title");
  const url = normalizeUrl(str(formData, "url"));
  if (!title) return { error: "Zadej název odkazu." };
  if (!url) return { error: "Zadej platnou adresu (URL)." };
  const points = parsePoints(formData);
  if (typeof points !== "number") return points;

  const db = await getDb();
  await db
    .update(schema.links)
    .set({ title, url, description: str(formData, "description") || null, points })
    .where(eq(schema.links.id, link.id));
  revalidatePath(`/ucitel/temata/${link.topicId}`);
  return { success: "Uloženo." };
}

export async function deleteLink(formData: FormData) {
  const teacher = await requireTeacher();
  const link = await getOwnedLink(teacher.id, str(formData, "linkId"));
  if (!link) return;
  const db = await getDb();
  await db.delete(schema.links).where(eq(schema.links.id, link.id));
  revalidatePath(`/ucitel/temata/${link.topicId}`);
}
