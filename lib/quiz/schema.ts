import { z } from "zod";
import { newId } from "@/lib/ids";
import type { Question, QuizDefinition } from "./types";

const nonEmpty = (label: string) => z.string().trim().min(1, `${label} nesmí být prázdné`);

const base = {
  id: z.string().trim().min(1).optional(),
  text: nonEmpty("Text otázky"),
  explain: z.string().trim().optional(),
  points: z.number().int().min(1).max(100).optional(),
};

const options = z.array(nonEmpty("Možnost")).min(2, "Otázka musí mít alespoň 2 možnosti");

const singleSchema = z
  .object({ ...base, type: z.literal("single"), options, correct: z.array(z.number().int().min(0)).length(1, "single musí mít právě jednu správnou odpověď") })
  .refine((q) => q.correct.every((i) => i < q.options.length), { message: "Index správné odpovědi je mimo rozsah možností", path: ["correct"] });

const multiSchema = z
  .object({ ...base, type: z.literal("multi"), options, correct: z.array(z.number().int().min(0)).min(1, "multi musí mít alespoň jednu správnou odpověď") })
  .refine((q) => q.correct.every((i) => i < q.options.length), { message: "Index správné odpovědi je mimo rozsah možností", path: ["correct"] })
  .refine((q) => new Set(q.correct).size === q.correct.length, { message: "Indexy správných odpovědí se opakují", path: ["correct"] });

const booleanSchema = z.object({ ...base, type: z.literal("boolean"), correct: z.boolean() });

const textSchema = z.object({
  ...base,
  type: z.literal("text"),
  accept: z.array(nonEmpty("Přijímaná odpověď")).min(1, "text musí mít alespoň jednu přijímanou odpověď"),
  placeholder: z.string().optional(),
});

const matchingSchema = z.object({
  ...base,
  type: z.literal("matching"),
  pairs: z.array(z.object({ left: nonEmpty("Levá strana"), right: nonEmpty("Pravá strana") })).min(2, "matching musí mít alespoň 2 dvojice"),
  distractors: z.array(nonEmpty("Distraktor")).optional(),
});

export const questionSchema = z.discriminatedUnion("type", [singleSchema, multiSchema, booleanSchema, textSchema, matchingSchema]);

export const quizSchema = z.object({
  title: nonEmpty("Název kvízu"),
  description: z.string().trim().optional(),
  questions: z.array(questionSchema).min(1, "Kvíz musí mít alespoň jednu otázku"),
});

export type ParseResult = { ok: true; quiz: QuizDefinition } | { ok: false; errors: string[] };

/**
 * Naparsuje a zvaliduje JSON vložený učitelem. Chybějícím otázkám doplní id,
 * aby se daly párovat s odpověďmi v pokusech i po úpravě kvízu.
 */
export function parseQuizJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Neplatný JSON: ${(e as Error).message}`] };
  }
  return validateQuiz(raw);
}

export function validateQuiz(raw: unknown): ParseResult {
  const parsed = quizSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => {
      const path = issue.path.length ? formatPath(issue.path) : "kvíz";
      return `${path}: ${issue.message}`;
    });
    return { ok: false, errors };
  }
  const seen = new Set<string>();
  const questions: Question[] = parsed.data.questions.map((q) => {
    let id = q.id ?? newId();
    while (seen.has(id)) id = newId();
    seen.add(id);
    return { ...q, id } as Question;
  });
  return {
    ok: true,
    quiz: { title: parsed.data.title, description: parsed.data.description || undefined, questions },
  };
}

function formatPath(path: PropertyKey[]) {
  // ["questions", 3, "options", 1] -> "otázka 4 › options[1]"
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (p === "questions" && typeof path[i + 1] === "number") {
      parts.push(`otázka ${(path[i + 1] as number) + 1}`);
      i++;
    } else if (typeof p === "number") {
      parts[parts.length - 1] = `${parts[parts.length - 1]}[${p}]`;
    } else {
      parts.push(String(p));
    }
  }
  return parts.join(" › ");
}
