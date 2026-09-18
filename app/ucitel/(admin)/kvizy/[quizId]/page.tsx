import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedQuiz } from "@/lib/db/access";
import { deleteQuiz, updateQuizJson, updateQuizSettings } from "@/app/actions/quizzes";
import { PageTitle } from "@/components/shell";
import { Card, CardBody } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { ActionForm } from "@/components/teacher/action-form";
import { ConfirmButton } from "@/components/teacher/confirm-button";
import { QuizJsonForm } from "@/components/teacher/quiz-json-form";
import { QuizSettingsFields } from "@/components/teacher/quiz-settings-fields";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kvíz" };

export default async function QuizAdminPage(props: PageProps<"/ucitel/kvizy/[quizId]">) {
  const { quizId } = await props.params;
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, quizId);
  if (!quiz) notFound();

  const json = JSON.stringify(
    { title: quiz.title, description: quiz.description ?? undefined, questions: quiz.questions },
    null,
    2,
  );

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/ucitel" className="hover:text-text">Skupiny</Link> /{" "}
        <Link href={`/ucitel/skupiny/${quiz.topic.groupId}`} className="hover:text-text">{quiz.topic.group.name}</Link> /{" "}
        <Link href={`/ucitel/temata/${quiz.topicId}`} className="hover:text-text">{quiz.topic.title}</Link> / {quiz.title}
      </p>
      <PageTitle
        title={quiz.title}
        subtitle={plural(quiz.questions.length, ["otázka", "otázky", "otázek"])}
        actions={
          <Link href={`/ucitel/kvizy/${quiz.id}/vysledky`} className={buttonClass("secondary")}>
            Výsledky
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardBody>
            <h2 className="mb-1 text-lg font-semibold">Otázky (JSON)</h2>
            <p className="mb-4 text-sm text-muted">
              Uprav JSON a ulož. Otázky mají svá <code>id</code> – zachovej je, aby starší pokusy studentů dál seděly na správné otázky.
            </p>
            <QuizJsonForm action={updateQuizJson} hidden={{ quizId: quiz.id }} initialJson={json} submitLabel="Uložit otázky" />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <h2 className="mb-4 text-lg font-semibold">Nastavení</h2>
              <ActionForm action={updateQuizSettings} submitLabel="Uložit nastavení">
                <input type="hidden" name="quizId" value={quiz.id} />
                <QuizSettingsFields maxAttempts={quiz.maxAttempts} showAnswersAfter={quiz.showAnswersAfter} isOpen={quiz.isOpen} points={quiz.points} />
              </ActionForm>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="mb-2 text-lg font-semibold">Smazat kvíz</h2>
              <p className="mb-4 text-sm text-muted">Smaže kvíz i všechny pokusy studentů. Nelze vrátit.</p>
              <form action={deleteQuiz}>
                <input type="hidden" name="quizId" value={quiz.id} />
                <ConfirmButton variant="danger" message={`Opravdu smazat kvíz „${quiz.title}“ včetně všech výsledků?`}>
                  Smazat kvíz
                </ConfirmButton>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
