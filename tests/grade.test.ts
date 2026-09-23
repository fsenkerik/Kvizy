import { describe, expect, it } from "vitest";
import {
  buildReview,
  grade,
  isQuestionCorrect,
  matchingLayout,
  noShuffle,
  normalizeText,
  seededPermutation,
  toCanonicalAnswers,
  toPublicQuestion,
  toPublicQuestions,
  type ShuffleCtx,
} from "@/lib/quiz/engine";
import type { AnswerMap, MatchingQuestion, Question } from "@/lib/quiz/types";

const QUIZ_ID = "kviz1";
const PLAIN = noShuffle(QUIZ_ID);
const shuffled = (seed: string): ShuffleCtx => ({ quizId: QUIZ_ID, seed, shuffleQuestions: true, shuffleOptions: true });

const single: Question = { id: "s", type: "single", text: "?", options: ["a", "b", "c"], correct: [1] };
const multi: Question = { id: "m", type: "multi", text: "?", options: ["a", "b", "c", "d"], correct: [0, 2] };
const bool: Question = { id: "b", type: "boolean", text: "?", correct: false };
const text: Question = { id: "t", type: "text", text: "?", accept: ["Dots per inch", "1024"] };
const matching: MatchingQuestion = {
  id: "p",
  type: "matching",
  text: "?",
  pairs: [
    { left: "Intel", right: "Core i7" },
    { left: "AMD", right: "Ryzen" },
    { left: "NVIDIA", right: "GeForce" },
  ],
  distractors: ["Radeon"],
};

describe("normalizeText", () => {
  it("odstraní diakritiku, velikost písmen, interpunkci a mezery navíc", () => {
    expect(normalizeText("  Citlivost  Myši! ")).toBe("citlivost mysi");
    expect(normalizeText("Dots-Per-Inch")).toBe("dotsperinch");
    expect(normalizeText(null)).toBe("");
  });
});

describe("seededPermutation", () => {
  it("je deterministická a nikdy není identita", () => {
    for (let i = 0; i < 50; i++) {
      const seed = `seed-${i}`;
      const a = seededPermutation(4, seed);
      expect(a).toEqual(seededPermutation(4, seed));
      expect([...a].sort()).toEqual([0, 1, 2, 3]);
      expect(a.every((v, idx) => v === idx)).toBe(false);
    }
  });
});

describe("isQuestionCorrect (kanonické odpovědi)", () => {
  it("single", () => {
    expect(isQuestionCorrect(single, 1)).toBe(true);
    expect(isQuestionCorrect(single, 0)).toBe(false);
    expect(isQuestionCorrect(single, undefined)).toBe(false);
  });
  it("multi je všechno-nebo-nic", () => {
    expect(isQuestionCorrect(multi, [2, 0])).toBe(true);
    expect(isQuestionCorrect(multi, [0])).toBe(false);
    expect(isQuestionCorrect(multi, [0, 2, 3])).toBe(false);
  });
  it("boolean", () => {
    expect(isQuestionCorrect(bool, false)).toBe(true);
    expect(isQuestionCorrect(bool, true)).toBe(false);
    expect(isQuestionCorrect(bool, "false")).toBe(false);
  });
  it("text porovnává po normalizaci proti všem přijímaným variantám", () => {
    expect(isQuestionCorrect(text, "dots per inch")).toBe(true);
    expect(isQuestionCorrect(text, " DOTS  PER INCH. ")).toBe(true);
    expect(isQuestionCorrect(text, "1024")).toBe(true);
    expect(isQuestionCorrect(text, "1000")).toBe(false);
    expect(isQuestionCorrect(text, "")).toBe(false);
  });
  it("matching: v kanonickém pořadí patří k i-té dvojici i-tá možnost", () => {
    expect(isQuestionCorrect(matching, [0, 1, 2])).toBe(true);
    expect(isQuestionCorrect(matching, [0, 1, 3])).toBe(false);
    expect(isQuestionCorrect(matching, [null, null, null])).toBe(false);
  });
});

describe("míchání pro studenty", () => {
  const questions: Question[] = [single, multi, bool, text, matching];

  it("bez míchání zůstává původní pořadí otázek i možností", () => {
    const pub = toPublicQuestions(questions, PLAIN);
    expect(pub.map((q) => q.id)).toEqual(["s", "m", "b", "t", "p"]);
    const first = pub[0];
    if (first.type !== "single") throw new Error("expected single");
    expect(first.options).toEqual(["a", "b", "c"]);
  });

  it("různí studenti dostanou různé pořadí, stejný student vždy stejné", () => {
    const a1 = toPublicQuestions(questions, shuffled("student-a")).map((q) => q.id);
    const a2 = toPublicQuestions(questions, shuffled("student-a")).map((q) => q.id);
    const b1 = toPublicQuestions(questions, shuffled("student-b")).map((q) => q.id);
    expect(a1).toEqual(a2);
    expect(a1).not.toEqual(["s", "m", "b", "t", "p"]);
    expect([...a1].sort()).toEqual(["b", "m", "p", "s", "t"]);
    expect(a1).not.toEqual(b1);
  });

  it("odpovědi ze zamíchaného pořadí se přepočítají na kanonické a hodnotí správně", () => {
    const ctx = shuffled("student-a");
    const pub = toPublicQuestion(single, ctx);
    if (pub.type !== "single") throw new Error("expected single");
    // Student klikne na možnost "b" (správnou) na pozici, kde ji vidí.
    const shownIndex = pub.options.indexOf("b");
    const canonical = toCanonicalAnswers([single], ctx, { s: shownIndex });
    expect(canonical.s).toBe(1);
    expect(isQuestionCorrect(single, canonical.s)).toBe(true);
  });

  it("multi i matching se přepočítají správně", () => {
    const ctx = shuffled("student-c");
    const pubMulti = toPublicQuestion(multi, ctx);
    if (pubMulti.type !== "multi") throw new Error("expected multi");
    const shown = [pubMulti.options.indexOf("a"), pubMulti.options.indexOf("c")];
    const canonicalMulti = toCanonicalAnswers([multi], ctx, { m: shown });
    expect(isQuestionCorrect(multi, canonicalMulti.m)).toBe(true);

    const layout = matchingLayout(matching, ctx);
    const pubMatching = toPublicQuestion(matching, ctx);
    if (pubMatching.type !== "matching") throw new Error("expected matching");
    expect(pubMatching.rights).toHaveLength(4);
    const shownMatching = matching.pairs.map((p) => pubMatching.rights.indexOf(p.right));
    const canonicalMatching = toCanonicalAnswers([matching], ctx, { p: shownMatching });
    expect(canonicalMatching.p).toEqual([0, 1, 2]);
    expect(isQuestionCorrect(matching, canonicalMatching.p)).toBe(true);
    expect(layout.rights.map((r, i) => layout.toCanonical[i])).toHaveLength(4);
  });

  it("veřejná verze otázky nikdy neobsahuje správné odpovědi", () => {
    for (const q of questions) {
      const pub = toPublicQuestion({ ...q, explain: "TAJNÉ" }, shuffled("x")) as unknown as Record<string, unknown>;
      expect(pub).not.toHaveProperty("correct");
      expect(pub).not.toHaveProperty("accept");
      expect(pub).not.toHaveProperty("explain");
      expect(pub).not.toHaveProperty("pairs");
    }
  });
});

describe("grade", () => {
  it("sečte body a spočítá procenta", () => {
    const questions: Question[] = [single, multi, bool, { ...text, points: 2 }];
    const answers: AnswerMap = { s: 1, m: [0, 2], b: true, t: "1024" };
    const result = grade(questions, answers);
    expect(result.score).toBe(4);
    expect(result.maxScore).toBe(5);
    expect(result.percent).toBe(80);
    expect(result.results.map((r) => r.correct)).toEqual([true, true, false, true]);
  });
});

describe("buildReview", () => {
  it("vrací správné odpovědi a vysvětlení v původním pořadí", () => {
    const questions: Question[] = [{ ...single, explain: "Protože b." }, matching];
    const answers: AnswerMap = { s: 0 };
    const g = grade(questions, answers);
    const review = buildReview(questions, answers, g.results);
    expect(review.map((r) => r.question.id)).toEqual(["s", "p"]);
    expect(review[0].correct).toBe(false);
    expect(review[0].correctAnswer).toBe(1);
    expect(review[0].explain).toBe("Protože b.");
    expect(review[1].correctAnswer).toEqual([0, 1, 2]);
  });

  it("s kontextem studenta zobrazí jeho pořadí a jeho odpověď na správném místě", () => {
    const ctx = shuffled("student-d");
    const questions: Question[] = [single, multi];
    const canonical: AnswerMap = { s: 1, m: [0, 2] };
    const g = grade(questions, canonical);
    const review = buildReview(questions, canonical, g.results, ctx);
    const item = review.find((r) => r.question.id === "s")!;
    if (item.question.type !== "single") throw new Error("expected single");
    expect(item.correct).toBe(true);
    // Odpověď i správná odpověď ukazují na možnost "b" v zobrazeném pořadí.
    expect(item.answer).toBe(item.question.options.indexOf("b"));
    expect(item.correctAnswer).toBe(item.question.options.indexOf("b"));
  });
});
