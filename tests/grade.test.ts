import { describe, expect, it } from "vitest";
import { buildReview, grade, isQuestionCorrect, matchingLayout, normalizeText, seededPermutation, toPublicQuestion } from "@/lib/quiz/engine";
import type { MatchingQuestion, Question } from "@/lib/quiz/types";

const QUIZ_ID = "kviz1";

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
      const b = seededPermutation(4, seed);
      expect(a).toEqual(b);
      expect([...a].sort()).toEqual([0, 1, 2, 3]);
      expect(a.every((v, idx) => v === idx)).toBe(false);
    }
  });
});

describe("isQuestionCorrect", () => {
  it("single", () => {
    expect(isQuestionCorrect(single, QUIZ_ID, 1)).toBe(true);
    expect(isQuestionCorrect(single, QUIZ_ID, 0)).toBe(false);
    expect(isQuestionCorrect(single, QUIZ_ID, undefined)).toBe(false);
  });
  it("multi je všechno-nebo-nic", () => {
    expect(isQuestionCorrect(multi, QUIZ_ID, [2, 0])).toBe(true);
    expect(isQuestionCorrect(multi, QUIZ_ID, [0])).toBe(false);
    expect(isQuestionCorrect(multi, QUIZ_ID, [0, 2, 3])).toBe(false);
  });
  it("boolean", () => {
    expect(isQuestionCorrect(bool, QUIZ_ID, false)).toBe(true);
    expect(isQuestionCorrect(bool, QUIZ_ID, true)).toBe(false);
    expect(isQuestionCorrect(bool, QUIZ_ID, "false")).toBe(false);
  });
  it("text porovnává po normalizaci proti všem přijímaným variantám", () => {
    expect(isQuestionCorrect(text, QUIZ_ID, "dots per inch")).toBe(true);
    expect(isQuestionCorrect(text, QUIZ_ID, " DOTS  PER INCH. ")).toBe(true);
    expect(isQuestionCorrect(text, QUIZ_ID, "1024")).toBe(true);
    expect(isQuestionCorrect(text, QUIZ_ID, "1000")).toBe(false);
    expect(isQuestionCorrect(text, QUIZ_ID, "")).toBe(false);
  });
  it("matching používá zamíchané indexy z veřejné verze otázky", () => {
    const layout = matchingLayout(matching, QUIZ_ID);
    const pub = toPublicQuestion(matching, QUIZ_ID);
    expect(pub.type).toBe("matching");
    if (pub.type !== "matching") return;
    expect(pub.rights).toEqual(layout.rights);
    expect(pub.rights).toHaveLength(4);
    const correctAnswer = matching.pairs.map((p) => pub.rights.indexOf(p.right));
    expect(isQuestionCorrect(matching, QUIZ_ID, correctAnswer)).toBe(true);
    const wrong = [...correctAnswer];
    wrong[0] = pub.rights.indexOf("Radeon");
    expect(isQuestionCorrect(matching, QUIZ_ID, wrong)).toBe(false);
    expect(isQuestionCorrect(matching, QUIZ_ID, [null, null, null])).toBe(false);
  });
});

describe("grade", () => {
  it("sečte body a spočítá procenta", () => {
    const questions: Question[] = [single, multi, bool, { ...text, points: 2 }];
    const result = grade(questions, QUIZ_ID, { s: 1, m: [0, 2], b: true, t: "1024" });
    expect(result.score).toBe(4);
    expect(result.maxScore).toBe(5);
    expect(result.percent).toBe(80);
    expect(result.results.map((r) => r.correct)).toEqual([true, true, false, true]);
  });
});

describe("buildReview", () => {
  it("vrací správné odpovědi a vysvětlení k otázkám", () => {
    const questions: Question[] = [{ ...single, explain: "Protože b." }, matching];
    const answers = { s: 0 };
    const g = grade(questions, QUIZ_ID, answers);
    const review = buildReview(questions, QUIZ_ID, answers, g.results);
    expect(review[0].correct).toBe(false);
    expect(review[0].correctAnswer).toBe(1);
    expect(review[0].explain).toBe("Protože b.");
    const pub = review[1].question;
    if (pub.type !== "matching") throw new Error("expected matching");
    const expected = matching.pairs.map((p) => pub.rights.indexOf(p.right));
    expect(review[1].correctAnswer).toEqual(expected);
  });
});

describe("toPublicQuestion", () => {
  it("neobsahuje správné odpovědi ani vysvětlení", () => {
    for (const q of [single, multi, bool, text, matching] as Question[]) {
      const pub = toPublicQuestion({ ...q, explain: "TAJNÉ" }, QUIZ_ID) as unknown as Record<string, unknown>;
      expect(pub).not.toHaveProperty("correct");
      expect(pub).not.toHaveProperty("accept");
      expect(pub).not.toHaveProperty("explain");
      expect(pub).not.toHaveProperty("pairs");
    }
  });
});
