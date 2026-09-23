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

/* ---------- Míchání ----------
   Odpovědi studenta i uložené pokusy jsou vždy v „kanonickém“ pořadí podle JSON kvízu.
   Zamíchané pořadí se dopočítá deterministicky ze seedu (kvíz + otázka + student),
   takže každý student vidí jiné pořadí, ale po obnovení stránky stejné. */

export type ShuffleCtx = {
  quizId: string;
  /** Rozlišuje studenty – každý dostane jiné pořadí. */
  seed: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
};

/** Kontext bez míchání – pro revizi pokusu (učitel i student vidí původní pořadí z JSON). */
export function noShuffle(quizId: string): ShuffleCtx {
  return { quizId, seed: "", shuffleQuestions: false, shuffleOptions: false };
}

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

function identity(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

/** Vrátí permutaci indexů 0..n-1 stejnou pro stejný seed. */
export function seededPermutation(n: number, seed: string) {
  const rnd = mulberry32(hashSeed(seed));
  const idx = identity(n);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  // Pro >1 prvků zajistíme, že permutace není identita (ta by nic nezamíchala).
  if (n > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()!);
  return idx;
}

/** Obrácená permutace: z „kam se prvek přesunul“ na „co je na dané pozici“. */
function invert(perm: number[]) {
  return perm.reduce<number[]>((acc, canonical, shown) => ((acc[canonical] = shown), acc), []);
}

/** Pořadí otázek: pole kanonických indexů v pořadí, v jakém se zobrazí. */
export function questionOrder(count: number, ctx: ShuffleCtx) {
  return ctx.shuffleQuestions && count > 1 ? seededPermutation(count, `${ctx.quizId}:${ctx.seed}:q`) : identity(count);
}

/** Pořadí možností u single/multi otázky. */
function optionPerm(q: Question & { options: string[] }, ctx: ShuffleCtx) {
  const shown = ctx.shuffleOptions && q.options.length > 1 ? seededPermutation(q.options.length, `${ctx.quizId}:${q.id}:${ctx.seed}:o`) : identity(q.options.length);
  return { toCanonical: shown, toShown: invert(shown) };
}

/** Pravé možnosti u párování: nejdřív pravé strany dvojic, pak distraktory. */
function canonicalRights(q: MatchingQuestion) {
  return [...q.pairs.map((p) => p.right), ...(q.distractors ?? [])];
}

/**
 * Zamíchané pravé možnosti u párování a mapa mezi zobrazeným a kanonickým pořadím.
 * Bez míchání (revize) se pravé možnosti zobrazí v kanonickém pořadí.
 */
export function matchingLayout(q: MatchingQuestion, ctx: ShuffleCtx) {
  const rights = canonicalRights(q);
  const toCanonical = ctx.shuffleOptions && rights.length > 1 ? seededPermutation(rights.length, `${ctx.quizId}:${q.id}:${ctx.seed}:m`) : identity(rights.length);
  return { rights: toCanonical.map((ci) => rights[ci]), toCanonical, toShown: invert(toCanonical) };
}

/* ---------- Verze pro studenta ---------- */

export function toPublicQuestion(q: Question, ctx: ShuffleCtx): PublicQuestion {
  const points = q.points ?? 1;
  switch (q.type) {
    case "single":
    case "multi": {
      const { toCanonical } = optionPerm(q, ctx);
      return { id: q.id, type: q.type, text: q.text, points, options: toCanonical.map((ci) => q.options[ci]) };
    }
    case "boolean":
      return { id: q.id, type: "boolean", text: q.text, points };
    case "text":
      return { id: q.id, type: "text", text: q.text, points, placeholder: q.placeholder };
    case "matching": {
      const layout = matchingLayout(q, ctx);
      return { id: q.id, type: "matching", text: q.text, points, lefts: q.pairs.map((p) => p.left), rights: layout.rights };
    }
  }
}

/** Otázky pro studenta v zobrazeném pořadí, bez správných odpovědí. */
export function toPublicQuestions(questions: Question[], ctx: ShuffleCtx) {
  return questionOrder(questions.length, ctx).map((ci) => toPublicQuestion(questions[ci], ctx));
}

/* ---------- Převod odpovědí mezi zobrazeným a kanonickým pořadím ---------- */

function mapAnswer(q: Question, answer: AnswerValue | undefined, map: (i: number) => number): AnswerValue | undefined {
  if (answer === undefined || answer === null) return answer;
  switch (q.type) {
    case "single":
      return typeof answer === "number" ? map(answer) : answer;
    case "multi":
      return Array.isArray(answer)
        ? (answer as (number | null)[]).filter((x): x is number => typeof x === "number").map(map).sort((a, b) => a - b)
        : answer;
    case "matching":
      return Array.isArray(answer) ? (answer as (number | null)[]).map((x) => (typeof x === "number" ? map(x) : x)) : answer;
    default:
      return answer;
  }
}

function perms(q: Question, ctx: ShuffleCtx) {
  if (q.type === "single" || q.type === "multi") return optionPerm(q, ctx);
  if (q.type === "matching") return matchingLayout(q, ctx);
  return null;
}

/** Odpovědi ze zobrazeného pořadí převede do kanonického (pro hodnocení a uložení). */
export function toCanonicalAnswers(questions: Question[], ctx: ShuffleCtx, answers: AnswerMap): AnswerMap {
  const out: AnswerMap = {};
  for (const q of questions) {
    const p = perms(q, ctx);
    const value = mapAnswer(q, answers[q.id], (i) => p?.toCanonical[i] ?? i);
    if (value !== undefined) out[q.id] = value;
  }
  return out;
}

/** Opačný směr – pro revizi hned po odevzdání, aby student viděl své pořadí. */
export function toShownAnswers(questions: Question[], ctx: ShuffleCtx, answers: AnswerMap): AnswerMap {
  const out: AnswerMap = {};
  for (const q of questions) {
    const p = perms(q, ctx);
    const value = mapAnswer(q, answers[q.id], (i) => p?.toShown[i] ?? i);
    if (value !== undefined) out[q.id] = value;
  }
  return out;
}

/* ---------- Hodnocení (vždy nad kanonickými odpověďmi) ---------- */

function sameSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

export function isQuestionCorrect(q: Question, answer: AnswerValue | undefined): boolean {
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
    case "matching":
      // V kanonickém pořadí patří k i-té dvojici i-tá pravá možnost.
      return Array.isArray(answer) && answer.length === q.pairs.length && q.pairs.every((_, i) => answer[i] === i);
  }
}

export function grade(questions: Question[], answers: AnswerMap): GradeResult {
  const results: QuestionResult[] = questions.map((q) => {
    const points = q.points ?? 1;
    const correct = isQuestionCorrect(q, answers[q.id]);
    return { id: q.id, correct, points, earned: correct ? points : 0 };
  });
  const score = results.reduce((s, r) => s + r.earned, 0);
  const maxScore = results.reduce((s, r) => s + r.points, 0);
  const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  return { score, maxScore, percent, results };
}

/* ---------- Revize ---------- */

/** Správná odpověď ve tvaru, který odpovídá zobrazené verzi otázky. */
export function correctAnswerFor(q: Question, ctx: ShuffleCtx): AnswerValue {
  switch (q.type) {
    case "single":
      return optionPerm(q, ctx).toShown[q.correct[0]];
    case "multi": {
      const { toShown } = optionPerm(q, ctx);
      return q.correct.map((ci) => toShown[ci]).sort((a, b) => a - b);
    }
    case "boolean":
      return q.correct;
    case "text":
      return q.accept[0];
    case "matching": {
      const layout = matchingLayout(q, ctx);
      return q.pairs.map((_, i) => layout.toShown[i]);
    }
  }
}

/**
 * Revize pokusu. `answers` jsou kanonické (tak se ukládají); pokud chceš zobrazit
 * pořadí, které student viděl, předej jeho ctx – funkce si odpovědi převede sama.
 */
export function buildReview(questions: Question[], answers: AnswerMap, results: QuestionResult[], ctx?: ShuffleCtx): ReviewQuestion[] {
  const context = ctx ?? noShuffle("");
  const shown = ctx ? toShownAnswers(questions, ctx, answers) : answers;
  const byId = new Map(results.map((r) => [r.id, r]));
  return questionOrder(questions.length, context).map((ci) => {
    const q = questions[ci];
    const r = byId.get(q.id);
    return {
      question: toPublicQuestion(q, context),
      answer: shown[q.id],
      correct: r?.correct ?? false,
      earned: r?.earned ?? 0,
      correctAnswer: correctAnswerFor(q, context),
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
