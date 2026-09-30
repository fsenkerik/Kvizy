"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteQuestion, duplicateQuestion, moveQuestion } from "@/app/actions/questions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { QUESTION_TYPE_LABELS, type Question } from "@/lib/quiz/types";
import { QuestionForm } from "./question-form";

/** Krátký souhrn správné odpovědi pod otázkou. */
function answerSummary(q: Question) {
  switch (q.type) {
    case "single":
      return q.options[q.correct[0]] ?? "—";
    case "multi":
      return q.correct.map((i) => q.options[i]).join(" + ");
    case "boolean":
      return q.correct ? "Pravda" : "Nepravda";
    case "text":
      return q.accept.join(" / ");
    case "matching":
      return q.pairs.map((p) => `${p.left} → ${p.right}`).join(", ");
  }
}

export function QuestionEditor({ quizId, questions, isOpen }: { quizId: string; questions: Question[]; isOpen?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Question | null>(null);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; errors?: string[] }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.errors?.join(" ") ?? "Něco se nepovedlo.");
      router.refresh();
    });
  }

  function closeAndRefresh() {
    setEditing(null);
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Úpravy se ukládají rovnou do kvízu. Otázky si drží své pořadí z editoru – studentům se pak (podle nastavení) zamíchají.
        </p>
        <Button onClick={() => setAdding(true)}>+ Přidat otázku</Button>
      </div>

      {error && <Alert>{error}</Alert>}

      {isOpen === false && questions.length > 0 && (
        <Alert tone="warning">
          Kvíz je zatím <strong>zavřený</strong> – studenti ho nevidí. Až ho budeš mít hotový, otevři ho v nastavení kvízu.
        </Alert>
      )}

      {questions.length === 0 && (
        <EmptyState title="Kvíz zatím nemá žádnou otázku" hint="Přidej první otázku tlačítkem „+ Přidat otázku“ vpravo nahoře." />
      )}

      <ol className="space-y-3">
        {questions.map((q, index) => (
          <li key={q.id} className="rounded-card border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{q.text}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone="lavender">{QUESTION_TYPE_LABELS[q.type]}</Badge>
                    {(q.points ?? 1) !== 1 && <Badge>{q.points} b.</Badge>}
                    {!q.explain && <Badge tone="warning">bez vysvětlení</Badge>}
                  </div>
                  <p className="mt-1.5 text-sm text-muted">
                    <span className="text-success-fg">✓ {answerSummary(q)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" aria-label="Posunout nahoru" disabled={index === 0 || pending} onClick={() => run(() => moveQuestion(quizId, q.id, "up"))}>
                  ↑
                </Button>
                <Button variant="ghost" size="sm" aria-label="Posunout dolů" disabled={index === questions.length - 1 || pending} onClick={() => run(() => moveQuestion(quizId, q.id, "down"))}>
                  ↓
                </Button>
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => duplicateQuestion(quizId, q.id))} title="Vytvořit kopii otázky">
                  Kopie
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditing(q)}>
                  ✏️ Upravit
                </Button>
                <Button variant="ghost" size="sm" className="text-danger-fg" disabled={pending} onClick={() => setToDelete(q)}>
                  Smazat
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <Dialog title="Nová otázka" open={adding} onClose={() => setAdding(false)}>
        {adding && <QuestionForm quizId={quizId} onSaved={closeAndRefresh} onCancel={() => setAdding(false)} />}
      </Dialog>

      <Dialog title="Úprava otázky" open={editing !== null} onClose={() => setEditing(null)}>
        {editing && <QuestionForm quizId={quizId} question={editing} onSaved={closeAndRefresh} onCancel={() => setEditing(null)} />}
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Smazat otázku?"
        confirmLabel="Smazat"
        tone="danger"
        onConfirm={() => {
          const q = toDelete;
          setToDelete(null);
          if (q) run(() => deleteQuestion(quizId, q.id));
        }}
        onCancel={() => setToDelete(null)}
      >
        „{toDelete?.text}“ zmizí z kvízu. Už odevzdané pokusy zůstanou, ale tuhle otázku v nich neuvidíš.
      </ConfirmDialog>
    </div>
  );
}
