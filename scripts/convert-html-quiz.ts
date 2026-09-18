import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { convertHtmlQuiz, slugify } from "../lib/quiz/convert-html";

/**
 * Převod původních HTML kvízů do JSON (CLI nad lib/quiz/convert-html.ts).
 * Použití: npm run convert-quiz -- cesta/ke/kvizu.html [další.html …]
 * Výstup:  content/quizzes/<název>.json
 */
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Použití: npm run convert-quiz -- soubor.html [další.html …]");
  process.exit(1);
}
const outDir = join(process.cwd(), "content", "quizzes");
mkdirSync(outDir, { recursive: true });
for (const file of files) {
  const quiz = convertHtmlQuiz(readFileSync(file, "utf8"));
  const out = join(outDir, `${slugify(quiz.title)}.json`);
  writeFileSync(out, JSON.stringify(quiz, null, 2) + "\n", "utf8");
  console.log(`${basename(file)} → ${out} (${quiz.questions.length} otázek)`);
}
