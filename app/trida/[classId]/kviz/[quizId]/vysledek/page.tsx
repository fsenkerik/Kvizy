import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { buildReview, verdictFor } from "@/lib/quiz/engine";
import { Shell, PageTitle } from "@/components/shell";
import { AttemptReview } from "@/components/quiz/review";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Výsledek" };

/** Poslední pokus studenta u kvízu (s revizí, pokud ji učitel povolil). */
export default async function QuizResultPage(props: PageProps<"/trida/[classId]/kviz/[quizId]/vysledek">) {
  const { classId, quizId } = await props.params;
  const student = await requireStudent(classId);

  const db = await getDb();
  const quiz = await db.query.quizzes.findFirst({ where: eq(schema.quizzes.id, quizId), with: { topic: true } });
  if (!quiz || quiz.topic.groupId !== student.class.groupId) notFound();

  const attempts = await db.query.attempts.findMany({
    where: and(eq(schema.attempts.quizId, quiz.id), eq(schema.attempts.studentId, student.id)),
    orderBy: [desc(schema.attempts.submittedAt)],
  });
  const last = attempts[0];
  if (!last) notFound();
  const best = attempts.reduce((b, a) => (a.percent > b.percent ? a : b), last);
  const attemptsLeft = quiz.maxAttempts === null ? null : Math.max(0, quiz.maxAttempts - attempts.length);

  return (
    <Shell right={<Link href={`/trida/${classId}`} className="text-sm text-muted hover:text-text">← Témata</Link>}>
      <PageTitle title={quiz.title} subtitle={`${quiz.topic.title} · poslední pokus ${formatDate(last.submittedAt)}`} />

      <div className="mb-6 rounded-card bg-primary-soft p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          {attempts.length > 1 ? `Poslední pokus (${attempts.length}.)` : "Tvůj výsledek"}
        </p>
        <p className="mt-2 text-5xl font-semibold tracking-tight">
          {last.score} / {last.maxScore}
        </p>
        <p className="mt-1 text-2xl text-muted">{last.percent} %</p>
        {attempts.length > 1 && best.id !== last.id && (
          <p className="mt-2 text-sm text-muted">
            Nejlepší pokus: {best.score} / {best.maxScore} ({best.percent} %)
          </p>
        )}
        <p className="mt-4">{verdictFor(last.percent)}</p>
        {(attemptsLeft === null || attemptsLeft > 0) && quiz.isOpen && (
          <div className="mt-6">
            <Link href={`/trida/${classId}/kviz/${quizId}`} className={buttonClass("primary")}>
              Zkusit znovu
            </Link>
          </div>
        )}
      </div>

      {quiz.showAnswersAfter ? (
        <AttemptReview review={buildReview(quiz.questions, quiz.id, last.answers, last.results)} />
      ) : (
        <Alert tone="info">Učitel u tohoto kvízu nezobrazuje správné odpovědi.</Alert>
      )}
    </Shell>
  );
}
