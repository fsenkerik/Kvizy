"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import type { QuizJsonState } from "@/app/actions/quizzes";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { closeParentDialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { parseQuizJson } from "@/lib/quiz/schema";
import { QUESTION_TYPE_LABELS } from "@/lib/quiz/types";
import { plural } from "@/lib/utils";

/**
 * Vložení / úprava kvízu jako JSON. Validuje se průběžně na klientovi
 * (náhled otázek), definitivně pak v server action.
 */
export function QuizJsonForm({
  action,
  hidden,
  initialJson = "",
  submitLabel,
  closeDialogOnSuccess = false,
}: {
  action: (prev: QuizJsonState, formData: FormData) => Promise<QuizJsonState>;
  hidden: Record<string, string>;
  initialJson?: string;
  submitLabel: string;
  closeDialogOnSuccess?: boolean;
}) {
  const [json, setJson] = useState(initialJson);
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: QuizJsonState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result?.success && closeDialogOnSuccess) {
      setJson("");
      closeParentDialog(ref.current);
    }
    return result;
  }, undefined);

  const preview = useMemo(() => (json.trim() ? parseQuizJson(json) : null), [json]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Textarea
        name="json"
        value={json}
        onChange={(e) => setJson(e.target.value)}
        spellCheck={false}
        className="min-h-64 font-mono text-sm"
        placeholder='{ "title": "Název kvízu", "questions": [ … ] }'
      />

      {preview && preview.ok && (
        <div className="rounded-xl border border-success-fg/40 bg-success-bg/50 p-3 text-sm">
          <p className="font-medium text-success-fg">
            ✓ {preview.quiz.title} · {plural(preview.quiz.questions.length, ["otázka", "otázky", "otázek"])} v pořádku
          </p>
          <ol className="mt-2 max-h-48 space-y-1 overflow-y-auto pl-5 text-text">
            {preview.quiz.questions.map((q, i) => (
              <li key={i} className="list-decimal">
                <span className="mr-2">{q.text}</span>
                <Badge tone="lavender">{QUESTION_TYPE_LABELS[q.type]}</Badge>
              </li>
            ))}
          </ol>
        </div>
      )}
      {preview && !preview.ok && (
        <Alert>
          <p className="font-medium">JSON obsahuje chyby:</p>
          <ul className="mt-1 list-disc pl-5">
            {preview.errors.slice(0, 15).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}

      {state?.error && !state.errors?.length && <Alert>{state.error}</Alert>}
      {state?.errors && state.errors.length > 0 && (
        <Alert>
          <ul className="list-disc pl-5">
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !preview?.ok}>
          {pending ? "Ukládám…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
