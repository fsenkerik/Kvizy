import { Badge } from "@/components/ui/badge";
import { QUESTION_TYPE_LABELS, type ReviewQuestion } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";

/**
 * Revize pokusu: každá otázka s odpovědí studenta a správnou odpovědí.
 * Používá se u studenta po odevzdání i u učitele v přehledu.
 */
export function AttemptReview({ review, showCorrect = true }: { review: ReviewQuestion[]; showCorrect?: boolean }) {
  return (
    <ol className="space-y-4">
      {review.map((item, index) => (
        <li
          key={item.question.id}
          className={cn(
            "rounded-card border bg-surface p-5",
            item.correct ? "border-success-fg/40" : "border-danger-fg/40",
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  item.correct ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg",
                )}
              >
                {index + 1}
              </span>
              <div>
                <p className="font-medium leading-snug">{item.question.text}</p>
                <p className="mt-0.5 text-xs text-muted">{QUESTION_TYPE_LABELS[item.question.type]}</p>
              </div>
            </div>
            <Badge tone={item.correct ? "success" : "danger"}>
              {item.earned} / {item.question.points}
            </Badge>
          </div>

          <ReviewBody item={item} showCorrect={showCorrect} />

          {showCorrect && item.explain && (
            <div className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <span className="font-medium">Vysvětlení: </span>
              {item.explain}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function ReviewBody({ item, showCorrect }: { item: ReviewQuestion; showCorrect: boolean }) {
  const q = item.question;
  const a = item.answer;

  const optionRow = (label: string, chosen: boolean, isCorrect: boolean) => (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
        chosen && isCorrect && showCorrect && "border-success-fg/50 bg-success-bg text-success-fg",
        chosen && (!isCorrect || !showCorrect) && "border-danger-fg/50 bg-danger-bg text-danger-fg",
        chosen && !isCorrect && !showCorrect && "border-border bg-surface-2 text-text",
        !chosen && isCorrect && showCorrect && "border-success-fg/50 bg-success-bg/60 text-success-fg",
        !chosen && (!isCorrect || !showCorrect) && "border-border text-muted",
      )}
    >
      <span>{label}</span>
      <span className="text-xs">
        {chosen ? "tvoje odpověď" : ""}
        {chosen && isCorrect && showCorrect ? " ✓" : ""}
        {!chosen && isCorrect && showCorrect ? "správně" : ""}
      </span>
    </div>
  );

  switch (q.type) {
    case "single":
      return (
        <div className="space-y-1.5">
          {q.options.map((opt, i) => optionRow(opt, a === i, item.correctAnswer === i))}
        </div>
      );
    case "multi": {
      const chosen = Array.isArray(a) ? (a as number[]) : [];
      const correct = Array.isArray(item.correctAnswer) ? (item.correctAnswer as number[]) : [];
      return <div className="space-y-1.5">{q.options.map((opt, i) => optionRow(opt, chosen.includes(i), correct.includes(i)))}</div>;
    }
    case "boolean":
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {optionRow("Pravda", a === true, item.correctAnswer === true)}
          {optionRow("Nepravda", a === false, item.correctAnswer === false)}
        </div>
      );
    case "text":
      return (
        <div className="space-y-1.5 text-sm">
          <p>
            <span className="text-muted">Tvoje odpověď: </span>
            <span className={cn("font-medium", item.correct ? "text-success-fg" : "text-danger-fg")}>
              {typeof a === "string" && a.trim() ? a : "—"}
            </span>
          </p>
          {showCorrect && (
            <p>
              <span className="text-muted">Správně: </span>
              <span className="font-medium text-success-fg">{(item.acceptedText ?? []).join(" / ")}</span>
            </p>
          )}
        </div>
      );
    case "matching": {
      const chosen = Array.isArray(a) ? (a as (number | null)[]) : [];
      const correct = Array.isArray(item.correctAnswer) ? (item.correctAnswer as number[]) : [];
      return (
        <div className="space-y-1.5 text-sm">
          {q.lefts.map((left, i) => {
            const ok = chosen[i] === correct[i];
            return (
              <div
                key={i}
                className={cn(
                  "grid gap-1 rounded-lg border px-3 py-2 sm:grid-cols-2",
                  ok ? "border-success-fg/50 bg-success-bg/60" : "border-danger-fg/50 bg-danger-bg/60",
                )}
              >
                <span className="font-medium">{left}</span>
                <span>
                  {chosen[i] != null ? q.rights[chosen[i]!] : "—"}
                  {showCorrect && !ok && <span className="text-muted"> · správně: {q.rights[correct[i]]}</span>}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
  }
}
