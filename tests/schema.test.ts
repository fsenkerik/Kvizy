import { describe, expect, it } from "vitest";
import { parseQuizJson } from "@/lib/quiz/schema";

const valid = {
  title: "Test",
  questions: [
    { type: "single", text: "A?", options: ["x", "y"], correct: [0] },
    { type: "multi", text: "B?", options: ["x", "y", "z"], correct: [0, 2], explain: "proto" },
    { type: "boolean", text: "C?", correct: true },
    { type: "text", text: "D?", accept: ["odpověď"] },
    { type: "matching", text: "E?", pairs: [{ left: "1", right: "a" }, { left: "2", right: "b" }] },
  ],
};

describe("parseQuizJson", () => {
  it("přijme platný kvíz a doplní id otázek", () => {
    const r = parseQuizJson(JSON.stringify(valid));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.quiz.questions).toHaveLength(5);
    const ids = r.quiz.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(5);
    ids.forEach((id) => expect(id.length).toBeGreaterThan(5));
  });

  it("zachová existující id", () => {
    const r = parseQuizJson(JSON.stringify({ ...valid, questions: [{ ...valid.questions[0], id: "moje-id" }] }));
    expect(r.ok && r.quiz.questions[0].id).toBe("moje-id");
  });

  it("odmítne neplatný JSON se srozumitelnou chybou", () => {
    const r = parseQuizJson("{ title: nope }");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toMatch(/Neplatný JSON/);
  });

  it("odmítne index správné odpovědi mimo rozsah", () => {
    const r = parseQuizJson(JSON.stringify({ title: "T", questions: [{ type: "single", text: "A?", options: ["x", "y"], correct: [5] }] }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join("\n")).toMatch(/otázka 1/);
    expect(r.errors.join("\n")).toMatch(/mimo rozsah/);
  });

  it("odmítne single s více správnými odpověďmi a prázdný kvíz", () => {
    const r1 = parseQuizJson(JSON.stringify({ title: "T", questions: [{ type: "single", text: "A?", options: ["x", "y"], correct: [0, 1] }] }));
    expect(r1.ok).toBe(false);
    const r2 = parseQuizJson(JSON.stringify({ title: "T", questions: [] }));
    expect(r2.ok).toBe(false);
    const r3 = parseQuizJson(JSON.stringify({ title: "", questions: valid.questions }));
    expect(r3.ok).toBe(false);
  });

  it("odmítne neznámý typ otázky", () => {
    const r = parseQuizJson(JSON.stringify({ title: "T", questions: [{ type: "essay", text: "A?" }] }));
    expect(r.ok).toBe(false);
  });
});
