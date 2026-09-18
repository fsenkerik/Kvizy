"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { submitAttempt, type SubmitResult } from "@/app/actions/attempts";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { isAnswered, verdictFor } from "@/lib/quiz/engine";
import { QUESTION_TYPE_LABELS, type AnswerMap, type AnswerValue, type PublicQuestion } from "@/lib/quiz/types";
import { QuestionInput } from "./question-input";
import { AttemptReview } from "./review";
import { usePoints } from "@/components/student/points-context";
import { Confetti } from "@/components/student/confetti";

export function QuizRunner({
  quizId,
  classId,
  questions,
}: {
  quizId: string;
  classId: string;
  questions: PublicQuestion[];
}) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<Extract<SubmitResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { award } = usePoints();

  const answeredCount = useMemo(() => questions.filter((q) => isAnswered(q, answers[q.id])).length, [questions, answers]);

  function setAnswer(id: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function submit() {
    const missing = questions.length - answeredCount;
    if (missing > 0 && !window.confirm(`Nemáš zodpovězeno ${missing} otázek. Opravdu chceš kvíz odevzdat?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await submitAttempt(quizId, answers);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Body v hlavičce se přičtou s malým zpožděním, aby animace navazovala na zobrazení výsledku.
      window.setTimeout(() => award({ total: res.points.total, max: res.points.max, earned: res.points.earned }), 400);
    });
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="relative rounded-card bg-primary-soft p-8 text-center">
          {result.points.earned > 0 && <Confetti pieces={result.percent === 100 ? 48 : 28} seed={result.score + 1} />}
          <p className="text-sm font-medium uppercase tracking-wide text-muted">Tvůj výsledek</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight">
            {result.score} / {result.maxScore}
          </p>
          <p className="mt-1 text-2xl text-muted">{result.percent} %</p>
          {result.points.quizMax > 0 && (
            <p className="kv-pop mt-3 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-lg font-semibold text-success-fg">
              ⭐ +{result.points.earned} {result.points.earned === 1 ? "bod" : result.points.earned >= 2 && result.points.earned <= 4 ? "body" : "bodů"}
              <span className="text-sm font-normal text-muted">z {result.points.quizMax}</span>
            </p>
          )}
          <p className="mt-4 text-base">{verdictFor(result.percent)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={`/trida/${classId}`} className={buttonClass("primary")}>
              Zpět na témata
            </Link>
            {(result.attemptsLeft === null || result.attemptsLeft > 0) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setAnswers({});
                  setResult(null);
                  window.scrollTo({ top: 0 });
                }}
              >
                Zkusit znovu
              </Button>
            )}
          </div>
        </div>
        {result.review ? (
          <AttemptReview review={result.review} />
        ) : (
          <Alert tone="info">Učitel u tohoto kvízu nezobrazuje správné odpovědi.</Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-bg/90 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Zodpovězeno {answeredCount} / {questions.length}
          </span>
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? "Odesílám…" : "Vyhodnotit kvíz"}
          </Button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-primary transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </div>

      <ol className="space-y-4">
        {questions.map((q, index) => (
          <li key={q.id} className="rounded-card border border-border bg-surface p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg">
                {index + 1}
              </span>
              <div>
                <p className="text-base font-medium leading-snug">{q.text}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="lavender">{QUESTION_TYPE_LABELS[q.type]}</Badge>
                  {q.points !== 1 && <Badge>{q.points} b.</Badge>}
                </div>
              </div>
            </div>
            <QuestionInput question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
          </li>
        ))}
      </ol>

      {error && <Alert>{error}</Alert>}

      <div className="flex justify-center pb-8">
        <Button size="lg" onClick={submit} disabled={pending}>
          {pending ? "Odesílám…" : "Vyhodnotit kvíz"}
        </Button>
      </div>
    </div>
  );
}
