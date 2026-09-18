import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { currentStudent } from "@/lib/auth/guards";
import { getStudentTopics } from "@/lib/db/queries";
import { studentLogout } from "@/app/actions/auth";
import { Shell, PageTitle } from "@/components/shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { StudentLoginForm } from "@/components/student/login-form";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Třída" };

export default async function ClassPage(props: PageProps<"/trida/[classId]">) {
  const { classId } = await props.params;
  const db = await getDb();
  const cls = await db.query.classes.findFirst({
    where: eq(schema.classes.id, classId),
    with: { group: true },
  });
  if (!cls) notFound();

  const student = await currentStudent();
  if (!student || student.classId !== cls.id) {
    const students = await db.query.students.findMany({
      where: and(eq(schema.students.classId, cls.id), eq(schema.students.isActive, true)),
      orderBy: [asc(schema.students.lastName), asc(schema.students.firstName)],
      columns: { id: true, firstName: true, lastName: true },
    });
    return (
      <Shell>
        <div className="mx-auto max-w-md">
          <PageTitle title={`Třída ${cls.name}`} subtitle={`${cls.group.name} · vyber své jméno a zadej PIN`} />
          <StudentLoginForm
            classId={cls.id}
            students={students.map((s) => ({ id: s.id, name: `${s.lastName} ${s.firstName}`.trim() }))}
          />
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/" className="hover:text-text">← Jiná třída</Link>
          </p>
        </div>
      </Shell>
    );
  }

  const topics = await getStudentTopics(cls.groupId, student.id);

  return (
    <Shell
      right={
        <form action={studentLogout} className="flex items-center gap-3">
          <input type="hidden" name="classId" value={cls.id} />
          <span className="hidden text-sm text-muted sm:inline">
            {student.firstName} {student.lastName}
          </span>
          <Button variant="secondary" size="sm" type="submit">
            Odhlásit
          </Button>
        </form>
      }
    >
      <PageTitle title={`Třída ${cls.name}`} subtitle={`Ahoj, ${student.firstName}! Tady jsou tvoje témata a kvízy.`} />

      {topics.length === 0 && <EmptyState title="Zatím tu nic není" hint="Učitel ještě nepřidal žádné téma." />}

      <div className="space-y-6">
        {topics.map((topic) => (
          <Card key={topic.id}>
            <CardBody>
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  {topic.weekNumber ? <span className="text-muted">{topic.weekNumber}. týden · </span> : null}
                  {topic.title}
                </h2>
                {topic.description && <p className="mt-1 text-sm text-muted">{topic.description}</p>}
              </div>

              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Kvízy</h3>
              {topic.quizzes.length === 0 && <p className="mb-4 text-sm text-muted">Žádný kvíz.</p>}
              <ul className="mb-5 space-y-2">
                {topic.quizzes.map((quiz) => {
                  const { summary } = quiz;
                  const attemptsLeft = quiz.maxAttempts === null ? null : Math.max(0, quiz.maxAttempts - summary.count);
                  const canStart = attemptsLeft === null || attemptsLeft > 0;
                  return (
                    <li key={quiz.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{quiz.title}</p>
                        <p className="text-xs text-muted">
                          {plural(quiz.questionCount, ["otázka", "otázky", "otázek"])}
                          {" · "}
                          {quiz.maxAttempts === null
                            ? "neomezeně pokusů"
                            : attemptsLeft === 0
                              ? "žádný další pokus"
                              : `zbývá ${plural(attemptsLeft!, ["pokus", "pokusy", "pokusů"])}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {summary.best ? (
                          <Badge tone={summary.best.percent >= 75 ? "success" : summary.best.percent >= 50 ? "warning" : "danger"}>
                            {summary.best.score} / {summary.best.maxScore} · {summary.best.percent} %
                          </Badge>
                        ) : (
                          <Badge>Nevyplněno</Badge>
                        )}
                        {summary.lastAttemptId && (
                          <Link href={`/trida/${cls.id}/kviz/${quiz.id}/vysledek`} className={buttonClass("secondary", "sm")}>
                            Výsledek
                          </Link>
                        )}
                        {canStart && (
                          <Link href={`/trida/${cls.id}/kviz/${quiz.id}`} className={buttonClass("primary", "sm")}>
                            {summary.count > 0 ? "Zkusit znovu" : "Spustit"}
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {topic.links.length > 0 && (
                <>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Cvičení a odkazy</h3>
                  <ul className="space-y-2">
                    {topic.links.map((link) => (
                      <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium">🔗 {link.title}</p>
                          {link.description && <p className="text-xs text-muted">{link.description}</p>}
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                          Otevřít ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
