import type {
  AnswerMap,
  AnswerValue,
  GradeResult,
  MatchingQuestion,
  PublicQuestion,
  Question,
  QuestionResult,
  ReviewQuestion,
} from "./types";

/* ---------- Normalizace textových odpovědí ---------- */

/** lowercase, bez diakritiky a interpunkce, sloučené mezery – stejně jako v původních HTML kvízech. */
export function normalizeText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------- Deterministické míchání (párování) ---------- */

function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Vrátí permutaci indexů 0..n-1 stejnou pro stejný seed. */
export function seededPermutation(n: number, seed: string) {
  const rnd = mulberry32(hashSeed(seed));
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  // Pro >1 prvků zajistíme, že permutace není identita (ta by prozradila odpověď).
  if (n > 1 && idx.every((v, i) => v === i)) {
    idx.push(idx.shift()!);
  }
  return idx;
}

/** Pravé možnosti v kanonickém pořadí: nejdřív pravé strany dvojic, pak distraktory. */
function canonicalRights(q: MatchingQuestion) {
  return [...q.pairs.map((p) => p.right), ...(q.distractors ?? [])];
}

/**
 * Zamíchané pravé možnosti a mapa: index v zamíchaném poli → kanonický index.
 * Seed = id kvízu + id otázky, takže server i klient vidí stejné pořadí.
 */
export function matchingLayout(q: MatchingQuestion, quizId: string) {
  const rights = canonicalRights(q);
  const perm = seededPermutation(rights.length, `${quizId}:${q.id}`);
  return {
    rights: perm.map((ci) => rights[ci]),
    /** shuffledIndex -> canonicalIndex */
    toCanonical: perm,
    /** canonicalIndex -> shuffledIndex */
    toShuffled: perm.reduce<number[]>((acc, ci, si) => ((acc[ci] = si), acc), []),
  };
}

/* ---------- Verze pro studenta ---------- */

export function toPublicQuestion(q: Question, quizId: string): PublicQuestion {
  const points = q.points ?? 1;
  switch (q.type) {
    case "single":
    case "multi":
      return { id: q.id, type: q.type, text: q.text, points, options: q.options };
    case "boolean":
      return { id: q.id, type: "boolean", text: q.text, points };
    case "text":
      return { id: q.id, type: "text", text: q.text, points, placeholder: q.placeholder };
    case "matching": {
      const layout = matchingLayout(q, quizId);
      return { id: q.id, type: "matching", text: q.text, points, lefts: q.pairs.map((p) => p.left), rights: layout.rights };
    }
  }
}

export function toPublicQuestions(questions: Question[], quizId: string) {
  return questions.map((q) => toPublicQuestion(q, quizId));
}

/* ---------- Hodnocení ---------- */

function sameSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

export function isQuestionCorrect(q: Question, quizId: string, answer: AnswerValue | undefined): boolean {
  switch (q.type) {
    case "single":
      return typeof answer === "number" && answer === q.correct[0];
    case "multi":
      return Array.isArray(answer) && sameSet((answer as (number | null)[]).filter((x): x is number => typeof x === "number"), q.correct);
    case "boolean":
      return typeof answer === "boolean" && answer === q.correct;
    case "text": {
      if (typeof answer !== "string") return false;
      const norm = normalizeText(answer);
      return norm.length > 0 && q.accept.some((a) => normalizeText(a) === norm);
    }
    case "matching": {
      if (!Array.isArray(answer) || answer.length !== q.pairs.length) return false;
      const layout = matchingLayout(q, quizId);
      return q.pairs.every((_, pairIndex) => {
        const chosen = answer[pairIndex];
        return typeof chosen === "number" && layout.toCanonical[chosen] === pairIndex;
      });
    }
  }
}

export function grade(questions: Question[], quizId: string, answers: AnswerMap): GradeResult {
  const results: QuestionResult[] = questions.map((q) => {
    const points = q.points ?? 1;
    const correct = isQuestionCorrect(q, quizId, answers[q.id]);
    return { id: q.id, correct, points, earned: correct ? points : 0 };
  });
  const score = results.reduce((s, r) => s + r.earned, 0);
  const maxScore = results.reduce((s, r) => s + r.points, 0);
  const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  return { score, maxScore, percent, results };
}

/* ---------- Revize ---------- */

/** Správná odpověď ve tvaru, který odpovídá PublicQuestion (u párování zamíchané indexy). */
export function correctAnswerFor(q: Question, quizId: string): AnswerValue {
  switch (q.type) {
    case "single":
      return q.correct[0];
    case "multi":
      return q.correct;
    case "boolean":
      return q.correct;
    case "text":
      return q.accept[0];
    case "matching": {
      const layout = matchingLayout(q, quizId);
      return q.pairs.map((_, i) => layout.toShuffled[i]);
    }
  }
}

export function buildReview(questions: Question[], quizId: string, answers: AnswerMap, results: QuestionResult[]): ReviewQuestion[] {
  const byId = new Map(results.map((r) => [r.id, r]));
  return questions.map((q) => {
    const r = byId.get(q.id);
    return {
      question: toPublicQuestion(q, quizId),
      answer: answers[q.id],
      correct: r?.correct ?? false,
      earned: r?.earned ?? 0,
      correctAnswer: correctAnswerFor(q, quizId),
      acceptedText: q.type === "text" ? q.accept : undefined,
      explain: q.explain,
    };
  });
}

/** Počet zodpovězených otázek – pro ukazatel postupu a potvrzení před odevzdáním. */
export function isAnswered(q: PublicQuestion, answer: AnswerValue | undefined) {
  if (answer === undefined || answer === null) return false;
  switch (q.type) {
    case "single":
      return typeof answer === "number";
    case "multi":
      return Array.isArray(answer) && answer.length > 0;
    case "boolean":
      return typeof answer === "boolean";
    case "text":
      return typeof answer === "string" && answer.trim().length > 0;
    case "matching":
      return Array.isArray(answer) && answer.length === q.lefts.length && answer.every((a) => typeof a === "number");
  }
}

/** Motivační věta podle procent (převzato z původních kvízů). */
export function verdictFor(percent: number) {
  if (percent === 100) return "Skvělé! Vše sedí, látku máš zvládnutou na jedničku.";
  if (percent >= 90) return "Výborně! Máš skvělé znalosti.";
  if (percent >= 75) return "Moc dobré! Jen pár věcí si ještě zopakuj.";
  if (percent >= 50) return "Dobrý základ, ale některým tématům je dobré se ještě věnovat.";
  return "Nevzdávej to! Projdi si látku znovu a zkus to ještě jednou.";
}
