import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedAttempt } from "@/lib/db/access";
import { buildReview } from "@/lib/quiz/engine";
import { PageTitle } from "@/components/shell";
import { AttemptReview } from "@/components/quiz/review";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Revize pokusu" };

export default async function AttemptPage(props: PageProps<"/ucitel/pokusy/[attemptId]">) {
  const { attemptId } = await props.params;
  const teacher = await requireTeacher();
  const attempt = await getOwnedAttempt(teacher.id, attemptId);
  if (!attempt) notFound();

  const db = await getDb();
  const siblings = await db.query.attempts.findMany({
    where: and(eq(schema.attempts.quizId, attempt.quizId), eq(schema.attempts.studentId, attempt.studentId)),
    orderBy: [asc(schema.attempts.attemptNumber)],
    columns: { id: true, attemptNumber: true, percent: true },
  });

  const { quiz, student } = attempt;

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/ucitel" className="hover:text-text">Skupiny</Link> /{" "}
        <Link href={`/ucitel/skupiny/${quiz.topic.groupId}`} className="hover:text-text">{quiz.topic.group.name}</Link> /{" "}
        <Link href={`/ucitel/kvizy/${quiz.id}/vysledky`} className="hover:text-text">{quiz.title}</Link> / Revize
      </p>
      <PageTitle
        title={`${student.lastName} ${student.firstName}`}
        subtitle={
          <>
            {student.class.name} · {quiz.title} · {attempt.attemptNumber}. pokus · {formatDate(attempt.submittedAt)}
          </>
        }
        actions={
          <Badge tone={attempt.percent >= 75 ? "success" : attempt.percent >= 50 ? "warning" : "danger"} className="px-3 py-1 text-base">
            {attempt.score} / {attempt.maxScore} · {attempt.percent} %
          </Badge>
        }
      />

      {siblings.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Pokusy:</span>
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={`/ucitel/pokusy/${s.id}`}
              className={cn(
                "rounded-lg border px-2.5 py-1",
                s.id === attempt.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2",
              )}
            >
              {s.attemptNumber}. · {s.percent} %
            </Link>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        <AttemptReview review={buildReview(quiz.questions, quiz.id, attempt.answers, attempt.results)} />
      </div>
    </>
  );
}
