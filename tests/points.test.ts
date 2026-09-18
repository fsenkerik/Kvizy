import { describe, expect, it } from "vitest";
import { quizPoints } from "@/lib/points";

describe("quizPoints", () => {
  it("převádí procenta na body podle maxima kvízu", () => {
    expect(quizPoints(100, 10)).toBe(10);
    expect(quizPoints(85, 10)).toBe(9);
    expect(quizPoints(84, 10)).toBe(8);
    expect(quizPoints(0, 10)).toBe(0);
    expect(quizPoints(50, 20)).toBe(10);
  });
  it("kvíz bez bodů dává 0 a procenta mimo rozsah se ořežou", () => {
    expect(quizPoints(100, 0)).toBe(0);
    expect(quizPoints(140, 10)).toBe(10);
    expect(quizPoints(-5, 10)).toBe(0);
  });
});
