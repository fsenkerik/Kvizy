"use client";

import { useState, useTransition } from "react";
import { saveQuestion } from "@/app/actions/questions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { Question, QuestionType } from "@/lib/quiz/types";

/** Rozpracovaná otázka – všechny typy v jednom, aby šlo přepínat bez ztráty textu. */
type Draft = {
  type: QuestionType;
  text: string;
  explain: string;
  points: string;
  options: string[];
  correctSingle: number;
  correctMulti: number[];
  correctBool: boolean;
  accept: string[];
  placeholder: string;
  pairs: { left: string; right: string }[];
  distractors: string[];
};

const EMPTY: Draft = {
  type: "single",
  text: "",
  explain: "",
  points: "1",
  options: ["", "", "", ""],
  correctSingle: 0,
  correctMulti: [],
  correctBool: true,
  accept: [""],
  placeholder: "",
  pairs: [
    { left: "", right: "" },
    { left: "", right: "" },
    { left: "", right: "" },
  ],
  distractors: [],
};

function toDraft(q: Question): Draft {
  const base = { ...EMPTY, type: q.type, text: q.text, explain: q.explain ?? "", points: String(q.points ?? 1) };
  switch (q.type) {
    case "single":
      return { ...base, options: [...q.options], correctSingle: q.correct[0] ?? 0 };
    case "multi":
      return { ...base, options: [...q.options], correctMulti: [...q.correct] };
    case "boolean":
      return { ...base, correctBool: q.correct };
    case "text":
      return { ...base, accept: [...q.accept], placeholder: q.placeholder ?? "" };
    case "matching":
      return { ...base, pairs: q.pairs.map((p) => ({ ...p })), distractors: [...(q.distractors ?? [])] };
  }
}

/** Z draftu udělá objekt otázky ve formátu kvízu (prázdné položky vypadnou, indexy se přepočítají). */
function toQuestion(d: Draft): Record<string, unknown> {
  const points = Number.parseInt(d.points, 10);
  const common = {
    text: d.text.trim(),
    explain: d.explain.trim() || undefined,
    points: Number.isFinite(points) && points !== 1 ? points : undefined,
  };

  if (d.type === "single" || d.type === "multi") {
    // Prázdné možnosti zahodíme a správné odpovědi přemapujeme na nové indexy.
    const kept = d.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o.length > 0);
    const remap = new Map(kept.map((x, newIndex) => [x.i, newIndex]));
    const options = kept.map((x) => x.o);
    if (d.type === "single") {
      const correct = remap.get(d.correctSingle);
      return { ...common, type: "single", options, correct: correct === undefined ? [] : [correct] };
    }
    const correct = d.correctMulti.map((i) => remap.get(i)).filter((i): i is number => i !== undefined).sort((a, b) => a - b);
    return { ...common, type: "multi", options, correct };
  }

  if (d.type === "boolean") return { ...common, type: "boolean", correct: d.correctBool };

  if (d.type === "text") {
    return {
      ...common,
      type: "text",
      accept: d.accept.map((a) => a.trim()).filter(Boolean),
      placeholder: d.placeholder.trim() || undefined,
    };
  }

  return {
    ...common,
    type: "matching",
    pairs: d.pairs.map((p) => ({ left: p.left.trim(), right: p.right.trim() })).filter((p) => p.left && p.right),
    distractors: d.distractors.map((x) => x.trim()).filter(Boolean).length
      ? d.distractors.map((x) => x.trim()).filter(Boolean)
      : undefined,
  };
}

export const TYPE_OPTIONS: { value: QuestionType; label: string; hint: string }[] = [
  { value: "single", label: "Výběr jedné odpovědi (ABCD)", hint: "Student vybere jednu možnost." },
  { value: "multi", label: "Výběr více odpovědí (klikací)", hint: "Správná je jen úplně celá kombinace." },
  { value: "boolean", label: "Pravda / nepravda", hint: "Tvrzení, které student posoudí." },
  { value: "text", label: "Otevřená odpověď (doplnění)", hint: "Porovnává se bez ohledu na velikost písmen a diakritiku." },
  { value: "matching", label: "Párování", hint: "Dvojice pojem – význam." },
];

const listBtn = "text-xs text-muted hover:text-text";

/**
 * Formulář pro přidání i úpravu otázky. Po uložení zavolá `onSaved`
 * (rodič zavře dialog); data se ukládají rovnou do kvízu.
 */
export function QuestionForm({
  quizId,
  question,
  initialType = "single",
  onSaved,
  onCancel,
}: {
  quizId: string;
  question?: Question;
  initialType?: QuestionType;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(question ? toDraft(question) : { ...EMPTY, type: initialType });
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function save() {
    setErrors([]);
    startTransition(async () => {
      const res = await saveQuestion(quizId, toQuestion(draft), question?.id);
      if (res.ok) onSaved();
      else setErrors(res.errors);
    });
  }

  const typeInfo = TYPE_OPTIONS.find((t) => t.value === draft.type);

  return (
    <div className="space-y-4">
      {!question && (
        <Field label="Typ otázky" hint={typeInfo?.hint}>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {TYPE_OPTIONS.map((t) => (
              <label
                key={t.value}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  draft.type === t.value ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"
                }`}
              >
                <input
                  type="radio"
                  name="qtype"
                  className="accent-[var(--primary)]"
                  checked={draft.type === t.value}
                  onChange={() => set("type", t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </Field>
      )}

      <Field label="Otázka">
        <Textarea value={draft.text} onChange={(e) => set("text", e.target.value)} className="min-h-20" autoFocus placeholder="Text otázky…" />
      </Field>

      {(draft.type === "single" || draft.type === "multi") && (
        <Field
          label="Možnosti"
          hint={draft.type === "single" ? "Označ kolečkem správnou odpověď." : "Zaškrtni všechny správné odpovědi."}
        >
          <div className="space-y-2">
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type={draft.type === "single" ? "radio" : "checkbox"}
                  name="correct"
                  className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                  checked={draft.type === "single" ? draft.correctSingle === i : draft.correctMulti.includes(i)}
                  onChange={(e) =>
                    draft.type === "single"
                      ? set("correctSingle", i)
                      : set("correctMulti", e.target.checked ? [...draft.correctMulti, i] : draft.correctMulti.filter((x) => x !== i))
                  }
                  aria-label={`Správná odpověď ${i + 1}`}
                />
                <Input
                  value={opt}
                  onChange={(e) => set("options", draft.options.map((o, oi) => (oi === i ? e.target.value : o)))}
                  placeholder={`Možnost ${i + 1}`}
                />
                {draft.options.length > 2 && (
                  <button
                    type="button"
                    className={listBtn}
                    onClick={() => {
                      set("options", draft.options.filter((_, oi) => oi !== i));
                      if (draft.type === "single" && draft.correctSingle >= i && draft.correctSingle > 0) set("correctSingle", draft.correctSingle - 1);
                      if (draft.type === "multi")
                        set("correctMulti", draft.correctMulti.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
                    }}
                    aria-label={`Smazat možnost ${i + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className={listBtn} onClick={() => set("options", [...draft.options, ""])}>
              + další možnost
            </button>
          </div>
        </Field>
      )}

      {draft.type === "boolean" && (
        <Field label="Správná odpověď">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: true, label: "Pravda" },
              { v: false, label: "Nepravda" },
            ].map(({ v, label }) => (
              <label
                key={label}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 ${
                  draft.correctBool === v ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"
                }`}
              >
                <input type="radio" name="bool" className="accent-[var(--primary)]" checked={draft.correctBool === v} onChange={() => set("correctBool", v)} />
                {label}
              </label>
            ))}
          </div>
        </Field>
      )}

      {draft.type === "text" && (
        <>
          <Field label="Uznávané odpovědi" hint="Stačí, když student napíše kteroukoli z nich. Diakritika a velikost písmen nevadí.">
            <div className="space-y-2">
              {draft.accept.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={a} onChange={(e) => set("accept", draft.accept.map((x, xi) => (xi === i ? e.target.value : x)))} placeholder="Správná odpověď" />
                  {draft.accept.length > 1 && (
                    <button type="button" className={listBtn} onClick={() => set("accept", draft.accept.filter((_, xi) => xi !== i))} aria-label="Smazat odpověď">
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className={listBtn} onClick={() => set("accept", [...draft.accept, ""])}>
                + další varianta
              </button>
            </div>
          </Field>
          <Field label="Nápověda v poli (volitelné)">
            <Input value={draft.placeholder} onChange={(e) => set("placeholder", e.target.value)} placeholder="Např. napiš jedno slovo" />
          </Field>
        </>
      )}

      {draft.type === "matching" && (
        <>
          <Field label="Dvojice" hint="Vlevo pojem, vpravo to, co k němu patří.">
            <div className="space-y-2">
              {draft.pairs.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={p.left} onChange={(e) => set("pairs", draft.pairs.map((x, xi) => (xi === i ? { ...x, left: e.target.value } : x)))} placeholder="Pojem" />
                  <span className="text-muted">→</span>
                  <Input value={p.right} onChange={(e) => set("pairs", draft.pairs.map((x, xi) => (xi === i ? { ...x, right: e.target.value } : x)))} placeholder="Význam" />
                  {draft.pairs.length > 2 && (
                    <button type="button" className={listBtn} onClick={() => set("pairs", draft.pairs.filter((_, xi) => xi !== i))} aria-label="Smazat dvojici">
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className={listBtn} onClick={() => set("pairs", [...draft.pairs, { left: "", right: "" }])}>
                + další dvojice
              </button>
            </div>
          </Field>
          <Field label="Možnosti navíc (volitelné)" hint="Nabídnou se vpravo, ale nepatří k žádnému pojmu.">
            <div className="space-y-2">
              {draft.distractors.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={d} onChange={(e) => set("distractors", draft.distractors.map((x, xi) => (xi === i ? e.target.value : x)))} placeholder="Nesprávná možnost" />
                  <button type="button" className={listBtn} onClick={() => set("distractors", draft.distractors.filter((_, xi) => xi !== i))} aria-label="Smazat možnost">
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className={listBtn} onClick={() => set("distractors", [...draft.distractors, ""])}>
                + další možnost navíc
              </button>
            </div>
          </Field>
        </>
      )}

      <Field label="Vysvětlení (volitelné)" hint="Zobrazí se studentovi po vyhodnocení.">
        <Textarea value={draft.explain} onChange={(e) => set("explain", e.target.value)} className="min-h-16" />
      </Field>

      <Field label="Body za otázku" hint="Kolik bodů má otázka v rámci kvízu (výchozí 1).">
        <Input type="number" min={1} max={100} value={draft.points} onChange={(e) => set("points", e.target.value)} className="w-24" />
      </Field>

      {errors.length > 0 && (
        <Alert>
          <ul className="list-disc pl-5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Zrušit
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Ukládám…" : question ? "Uložit změny" : "Přidat otázku"}
        </Button>
      </div>
    </div>
  );
}
