import { parse, type HTMLElement } from "node-html-parser";
import { validateQuiz } from "./schema";
import type { Question } from "./types";

/**
 * Převod původních HTML kvízů do JSON formátu aplikace.
 *
 * Podporované formáty:
 *  A) formulářový – bloky .question-block + JS objekty `answers` / `explanations`
 *     (hardware_kviz.html, periferie_kviz.html)
 *  B) datový – pole `const QUESTIONS = [...]` (Prima_DL1_Kviz_Soubory_OneDrive.html)
 *
 * CLI: scripts/convert-html-quiz.ts, v aplikaci: server action createQuizFromHtml.
 */

/** Otázka bez id (id doplní validace). Distributivní Omit, aby fungoval nad unií typů. */
type RawQuestion = Question extends infer Q ? (Q extends Question ? Omit<Q, "id"> & { id?: string } : never) : never;

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripEmoji(text: string) {
  return clean(text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ""));
}

/** Vyhodnotí JS objektový/pole literál ze zdrojáku (soubory jsou naše vlastní, ne cizí vstup). */
function evalLiteral<T>(source: string, name: string): T | null {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*`);
  const m = re.exec(source);
  if (!m) return null;
  const start = m.index + m[0].length;
  const open = source[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr: string | null = null;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") inStr = ch;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const literal = source.slice(start, i + 1);
        return new Function(`return (${literal});`)() as T;
      }
    }
  }
  return null;
}

/* ---------- Formát B ---------- */

type FormatBQuestion = { type: "single" | "multi" | "boolean"; text: string; options: string[]; correct: number[]; explain?: string };

function convertFormatB(source: string, root: HTMLElement) {
  const raw = evalLiteral<FormatBQuestion[]>(source, "QUESTIONS");
  if (!raw) return null;
  const questions: RawQuestion[] = raw.map((q) => {
    if (q.type === "boolean") {
      // options jsou ['Pravda', 'Nepravda'], correct [0] => pravda
      return { type: "boolean", text: clean(q.text), correct: q.correct[0] === 0, explain: q.explain };
    }
    return { type: q.type, text: clean(q.text), options: q.options.map(clean), correct: q.correct, explain: q.explain };
  });
  return {
    title: stripEmoji(root.querySelector("h1")?.text ?? "Kvíz").replace(/^Kvíz:\s*/i, ""),
    description: clean(root.querySelector("header p")?.text ?? ""),
    questions,
  };
}

/* ---------- Formát A ---------- */

type AnswerTable = Record<string, string | string[]>;

function convertFormatA(source: string, root: HTMLElement) {
  const answers = evalLiteral<AnswerTable>(source, "answers");
  const explanations = evalLiteral<Record<string, string>>(source, "explanations") ?? {};
  if (!answers) return null;

  const blocks = root.querySelectorAll(".question-block");
  const questions: RawQuestion[] = [];

  for (const block of blocks) {
    const textEl = block.querySelector(".question-text");
    if (!textEl) continue;
    textEl.querySelector(".question-type")?.remove();
    const text = clean(textEl.text);

    const radios = block.querySelectorAll('input[type="radio"]');
    const checkboxes = block.querySelectorAll('input[type="checkbox"]');
    const textInput = block.querySelector('input[type="text"]');
    const selects = block.querySelectorAll("select");

    if (radios.length > 0) {
      const name = radios[0].getAttribute("name")!;
      const values = radios.map((r) => r.getAttribute("value") ?? "");
      const labels = radios.map((r) => clean(block.querySelector(`label[for="${r.getAttribute("id")}"]`)?.text ?? ""));
      const correct = answers[name];
      if (values.every((v) => v === "true" || v === "false")) {
        questions.push({ type: "boolean", text, correct: correct === "true", explain: explanations[name] });
      } else {
        const idx = values.indexOf(String(correct));
        questions.push({ type: "single", text, options: labels, correct: [idx], explain: explanations[name] });
      }
      continue;
    }

    if (checkboxes.length > 0) {
      // Formát: name="q16a" value="correct"/"wrong"
      const labels = checkboxes.map((c) => clean(block.querySelector(`label[for="${c.getAttribute("id")}"]`)?.text ?? ""));
      const correct = checkboxes.map((c, i) => (c.getAttribute("value") === "correct" ? i : -1)).filter((i) => i >= 0);
      const base = (checkboxes[0].getAttribute("name") ?? "").replace(/[a-z]$/i, "");
      questions.push({ type: "multi", text, options: labels, correct, explain: explanations[base] });
      continue;
    }

    if (selects.length > 0) {
      const pairs: { left: string; right: string }[] = [];
      const explains: string[] = [];
      let distractorSource: string[] = [];
      for (const select of selects) {
        const name = select.getAttribute("name")!;
        const item = select.parentNode as HTMLElement;
        const leftText = clean(item.childNodes.filter((n) => n.nodeType === 3).map((n) => n.text).join(" ")).replace(/^\d+\.\s*/, "");
        const options = select.querySelectorAll("option").filter((o) => (o.getAttribute("value") ?? "") !== "");
        const correctValue = String(answers[name]);
        const right = clean(options.find((o) => o.getAttribute("value") === correctValue)?.text ?? "");
        pairs.push({ left: leftText, right });
        if (explanations[name]) explains.push(explanations[name]);
        distractorSource = options.map((o) => clean(o.text));
      }
      const used = new Set(pairs.map((p) => p.right));
      const distractors = distractorSource.filter((o) => !used.has(o));
      questions.push({ type: "matching", text, pairs, distractors: distractors.length ? distractors : undefined, explain: explains.join(" ") || undefined });
      continue;
    }

    if (textInput) {
      const name = textInput.getAttribute("name")!;
      const correct = answers[name];
      const accept = Array.isArray(correct) ? correct : [String(correct)];
      questions.push({ type: "text", text, accept, explain: explanations[name] });
      continue;
    }
  }

  return {
    title: stripEmoji(root.querySelector("h1")?.text ?? "Kvíz").replace(/\s*-\s*Kvíz.*$/i, "").replace(/\s*Kvíz$/i, ""),
    description: clean(root.querySelector(".subtitle")?.text ?? ""),
    questions,
  };
}

/* ---------- main ---------- */

export function convertHtmlQuiz(source: string) {
  const root = parse(source);
  const result = source.includes("const QUESTIONS") ? convertFormatB(source, root) : convertFormatA(source, root);
  if (!result) throw new Error("Nerozpoznaný formát kvízu.");
  const validated = validateQuiz(result);
  if (!validated.ok) throw new Error(`Převedený kvíz neprošel validací:\n${validated.errors.join("\n")}`);
  return validated.quiz;
}

export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
