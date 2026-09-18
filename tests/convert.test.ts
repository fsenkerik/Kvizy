import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { convertHtmlQuiz } from "@/lib/quiz/convert-html";

const load = (name: string) => readFileSync(new URL(`../content/source-html/${name}`, import.meta.url), "utf8");

describe("convertHtmlQuiz", () => {
  it("převede formulářový kvíz Hardware (20 otázek, přečíslované klíče)", () => {
    const quiz = convertHtmlQuiz(load("hardware_kviz.html"));
    expect(quiz.title).toBe("Hardware");
    expect(quiz.questions).toHaveLength(20);
    const q8 = quiz.questions[7];
    expect(q8.type).toBe("single");
    if (q8.type === "single") {
      expect(q8.text).toMatch(/Kolik bitů/);
      expect(q8.options[q8.correct[0]]).toBe("8 bitů");
    }
    const q9 = quiz.questions[8];
    expect(q9.type).toBe("matching");
    if (q9.type === "matching") {
      expect(q9.pairs.map((p) => p.right)).toEqual(["HDMI", "Ethernet", "Audio jack", "USB"]);
      expect(q9.distractors).toBeUndefined();
    }
    const q10 = quiz.questions[9];
    expect(q10.type === "text" && q10.accept).toEqual(["1000", "1024"]);
    const q2 = quiz.questions[1];
    expect(q2.type === "boolean" && q2.correct).toBe(false);
    expect(quiz.questions.every((q) => q.explain)).toBe(true);
  });

  it("převede kvíz Periferie včetně otázky s více správnými odpověďmi", () => {
    const quiz = convertHtmlQuiz(load("periferie_kviz.html"));
    expect(quiz.title).toBe("Periferní zařízení");
    expect(quiz.questions).toHaveLength(20);
    const q16 = quiz.questions[15];
    expect(q16.type).toBe("multi");
    if (q16.type === "multi") {
      expect(q16.correct).toEqual([0, 2]);
      expect(q16.options).toEqual(["Monitoru", "Klávesnice", "Projektoru", "Myši"]);
      expect(q16.explain).toMatch(/HDMI/);
    }
    const q4 = quiz.questions[3];
    expect(q4.type === "text" && q4.accept).toEqual(["citlivost mysi"]);
  });

  it("převede datový kvíz Prima (QUESTIONS pole)", () => {
    const quiz = convertHtmlQuiz(load("Prima_DL1_Kviz_Soubory_OneDrive.html"));
    expect(quiz.title).toBe("Soubory, složky a OneDrive");
    expect(quiz.questions).toHaveLength(8);
    expect(quiz.questions.map((q) => q.type)).toEqual(["single", "boolean", "single", "multi", "single", "boolean", "single", "single"]);
    const q2 = quiz.questions[1];
    expect(q2.type === "boolean" && q2.correct).toBe(true);
    const q6 = quiz.questions[5];
    expect(q6.type === "boolean" && q6.correct).toBe(false);
    const q4 = quiz.questions[3];
    expect(q4.type === "multi" && q4.correct).toEqual([0, 1, 3]);
  });
});
