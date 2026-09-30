import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedQuiz } from "@/lib/db/access";
import { toPublicQuestions } from "@/lib/quiz/engine";
import { PageTitle } from "@/components/shell";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { PreviewTabs } from "@/components/teacher/preview-tabs";
import { QuestionEditor } from "@/components/teacher/question-editor";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Náhled kvízu" };

/** Učitel si projde kvíz přesně jako student; odpovědi se nikam neukládají. */
export default async function QuizPreviewPage(props: PageProps<"/ucitel/kvizy/[quizId]/nahled">) {
  const { quizId } = await props.params;
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, quizId);
  if (!quiz) notFound();

  const questions = toPublicQuestions(quiz.questions, {
    quizId: quiz.id,
    seed: `nahled:${teacher.id}`,
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleOptions: quiz.shuffleOptions,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-2 text-sm text-muted">
        <Link href="/ucitel" className="hover:text-text">Skupiny</Link> /{" "}
        <Link href={`/ucitel/temata/${quiz.topicId}`} className="hover:text-text">{quiz.topic.title}</Link> /{" "}
        <Link href={`/ucitel/kvizy/${quiz.id}`} className="hover:text-text">{quiz.title}</Link> / Náhled
      </p>
      <PageTitle
        title={quiz.title}
        subtitle={
          <>
            {plural(questions.length, ["otázka", "otázky", "otázek"])}
            {quiz.points > 0 && ` · pro studenty až ⭐ ${quiz.points} b.`}
            {quiz.description && (
              <>
                <br />
                {quiz.description}
              </>
            )}
          </>
        }
        actions={
          <Link href={`/ucitel/kvizy/${quiz.id}`} className={buttonClass("secondary")}>
            Zpět na kvíz
          </Link>
        }
      />

      <Alert tone="info" className="mb-5">
        <strong>Náhled pro učitele.</strong> V záložce <em>Náhled</em> vidíš kvíz přesně jako student – odpovědi ani výsledek se neukládají.
        V záložce <em>Upravit otázky</em> můžeš otázky rovnou měnit, mazat i přidávat.
        {(quiz.shuffleQuestions || quiz.shuffleOptions) && " Pořadí je v náhledu zamíchané, stejně jako ho uvidí studenti."}
      </Alert>

      <PreviewTabs
        questionCount={quiz.questions.length}
        defaultTab={quiz.questions.length === 0 ? "upravy" : "nahled"}
        runner={<QuizRunner quizId={quiz.id} questions={questions} backHref={`/ucitel/kvizy/${quiz.id}`} backLabel="Zpět na kvíz" preview />}
        editor={<QuestionEditor quizId={quiz.id} questions={quiz.questions} isOpen={quiz.isOpen} />}
      />
    </div>
  );
}
