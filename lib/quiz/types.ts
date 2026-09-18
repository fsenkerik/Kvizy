/**
 * Datový formát kvízu. Uložený v DB (quizzes.questions) i vkládaný učitelem jako JSON.
 * Popis pro učitele je v docs/format-kvizu.md.
 */

type BaseQuestion = {
  id: string;
  text: string;
  /** Vysvětlení zobrazené po vyhodnocení. */
  explain?: string;
  /** Body za otázku, výchozí 1. */
  points?: number;
};

export type SingleQuestion = BaseQuestion & {
  type: "single";
  options: string[];
  /** Index správné možnosti (pole kvůli jednotnosti s multi, obsahuje právě jeden prvek). */
  correct: number[];
};

export type MultiQuestion = BaseQuestion & {
  type: "multi";
  options: string[];
  correct: number[];
};

export type BooleanQuestion = BaseQuestion & {
  type: "boolean";
  correct: boolean;
};

export type TextQuestion = BaseQuestion & {
  type: "text";
  /** Přijímané odpovědi, porovnávají se po normalizaci. */
  accept: string[];
  placeholder?: string;
};

export type MatchingQuestion = BaseQuestion & {
  type: "matching";
  pairs: { left: string; right: string }[];
  /** Možnosti navíc vpravo, které k ničemu nepatří. */
  distractors?: string[];
};

export type Question = SingleQuestion | MultiQuestion | BooleanQuestion | TextQuestion | MatchingQuestion;
export type QuestionType = Question["type"];

export type QuizDefinition = {
  title: string;
  description?: string;
  questions: Question[];
};

/* ---------- Verze pro studenta (bez správných odpovědí) ---------- */

export type PublicQuestion =
  | { id: string; type: "single" | "multi"; text: string; points: number; options: string[] }
  | { id: string; type: "boolean"; text: string; points: number }
  | { id: string; type: "text"; text: string; points: number; placeholder?: string }
  | {
      id: string;
      type: "matching";
      text: string;
      points: number;
      lefts: string[];
      /** Pravé možnosti v zamíchaném pořadí; odpověď = index do tohoto pole. */
      rights: string[];
    };

/* ---------- Odpovědi ---------- */

/** single: index | null, multi: index[], boolean: boolean | null, text: string, matching: (index|null)[] */
export type AnswerValue = number | null | number[] | boolean | string | (number | null)[];
export type AnswerMap = Record<string, AnswerValue>;

export type QuestionResult = {
  id: string;
  correct: boolean;
  points: number;
  earned: number;
};

export type GradeResult = {
  score: number;
  maxScore: number;
  percent: number;
  results: QuestionResult[];
};

/* ---------- Revize (student po odevzdání / učitel) ---------- */

export type ReviewQuestion = {
  question: PublicQuestion;
  answer: AnswerValue | undefined;
  correct: boolean;
  earned: number;
  /** Správná odpověď ve stejném tvaru jako odpověď studenta (indexy odpovídají PublicQuestion). */
  correctAnswer: AnswerValue;
  /** Pro text: všechny přijímané varianty k zobrazení. */
  acceptedText?: string[];
  explain?: string;
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "Výběr jedné odpovědi",
  multi: "Výběr více odpovědí",
  boolean: "Pravda / nepravda",
  text: "Doplnění",
  matching: "Párování",
};
