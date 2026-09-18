import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedQuiz } from "@/lib/db/access";
import { getQuizResults, statFor } from "@/lib/db/results";
import { PageTitle } from "@/components/shell";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { ScoreCell } from "@/components/teacher/score-cell";
import { formatDate } from "@/lib/utils";
import { ConfirmButton } from "@/components/teacher/confirm-button";
import { deleteQuizAttempts, deleteStudentQuizAttempts } from "@/app/actions/attempts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Výsledky kvízu" };

export default async function QuizResultsPage(props: PageProps<"/ucitel/kvizy/[quizId]/vysledky">) {
  const { quizId } = await props.params;
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, quizId);
  if (!quiz) notFound();

  const { classes, stats, attempts } = await getQuizResults(quiz.id, quiz.topic.groupId);
  const doneCount = new Set(attempts.map((a) => a.studentId)).size;
  const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percent, 0) / attempts.length) : null;

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/ucitel" className="hover:text-text">Skupiny</Link> /{" "}
        <Link href={`/ucitel/skupiny/${quiz.topic.groupId}`} className="hover:text-text">{quiz.topic.group.name}</Link> /{" "}
        <Link href={`/ucitel/temata/${quiz.topicId}`} className="hover:text-text">{quiz.topic.title}</Link> /{" "}
        <Link href={`/ucitel/kvizy/${quiz.id}`} className="hover:text-text">{quiz.title}</Link> / Výsledky
      </p>
      <PageTitle
        title={`Výsledky – ${quiz.title}`}
        subtitle={`Vyplnilo ${doneCount} studentů · ${attempts.length} pokusů${avg !== null ? ` · průměr ${avg} %` : ""}`}
        actions={
          <>
            <a href={`/ucitel/kvizy/${quiz.id}/vysledky/export`} className={buttonClass("secondary")}>
              Export CSV
            </a>
            {attempts.length > 0 && (
              <form action={deleteQuizAttempts}>
                <input type="hidden" name="quizId" value={quiz.id} />
                <ConfirmButton variant="danger" message={`Smazat všech ${attempts.length} pokusů u kvízu „${quiz.title}“? Studenti ho budou moci vyplnit znovu. Nelze vrátit.`}>
                  Smazat všechny pokusy
                </ConfirmButton>
              </form>
            )}
          </>
        }
      />

      {classes.length === 0 && <EmptyState title="Skupina nemá žádnou třídu" />}

      <div className="space-y-6">
        {classes.map((cls) => (
          <section key={cls.id}>
            <h2 className="mb-2 text-lg font-semibold">
              <Link href={`/ucitel/tridy/${cls.id}`} className="hover:text-primary">{cls.name}</Link>
            </h2>
            {cls.students.length === 0 && <p className="text-sm text-muted">Ve třídě nejsou studenti.</p>}
            {cls.students.length > 0 && (
              <div className="overflow-x-auto rounded-card border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2">Student</th>
                      <th className="px-4 py-2">Nejlepší</th>
                      <th className="px-4 py-2">Pokusů</th>
                      <th className="px-4 py-2">Poslední odevzdání</th>
                      <th className="px-4 py-2 text-right">Akce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cls.students.map((s) => {
                      const stat = statFor(stats, s.id, quiz.id);
                      return (
                        <tr key={s.id} className={!s.isActive ? "opacity-60" : undefined}>
                          <td className="px-4 py-2 font-medium">
                            {s.lastName} {s.firstName}
                          </td>
                          <td className="px-4 py-2">
                            <ScoreCell stat={stat} />
                            {stat.best && <span className="ml-2 text-xs text-muted">{stat.best.score} / {stat.best.maxScore}</span>}
                          </td>
                          <td className="px-4 py-2">{stat.count}</td>
                          <td className="px-4 py-2 text-muted">{stat.last ? formatDate(stat.last.submittedAt) : "–"}</td>
                          <td className="px-4 py-2">
                            {stat.last && (
                              <div className="flex items-center justify-end gap-1">
                                <Link href={`/ucitel/pokusy/${stat.last.attemptId}`} className={buttonClass("secondary", "sm")}>
                                  Zobrazit
                                </Link>
                                <form action={deleteStudentQuizAttempts}>
                                  <input type="hidden" name="quizId" value={quiz.id} />
                                  <input type="hidden" name="studentId" value={s.id} />
                                  <ConfirmButton variant="ghost" size="sm" className="text-danger-fg" message={`Smazat všechny pokusy (${stat.count}) studenta ${s.firstName} ${s.lastName} u tohoto kvízu? Bude ho moci vyplnit znovu.`}>
                                    Smazat
                                  </ConfirmButton>
                                </form>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
