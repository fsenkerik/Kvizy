import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth/guards";
import { countStudentAttempts, getQuizForStudent } from "@/lib/db/queries";
import { toPublicQuestions } from "@/lib/quiz/engine";
import { PageTitle } from "@/components/shell";
import { StudentShell } from "@/components/student/student-shell";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kvíz" };

export default async function QuizPage(props: PageProps<"/trida/[classId]/kviz/[quizId]">) {
  const { classId, quizId } = await props.params;
  const student = await requireStudent(classId);
  const quiz = await getQuizForStudent(quizId, student.class.groupId);
  if (!quiz) notFound();

  const used = await countStudentAttempts(quiz.id, student.id);
  if (quiz.maxAttempts !== null && used >= quiz.maxAttempts) {
    redirect(`/trida/${classId}/kviz/${quizId}/vysledek`);
  }

  // Studentovi posíláme jen veřejnou verzi otázek – bez správných odpovědí a vysvětlení.
  const questions = toPublicQuestions(quiz.questions, quiz.id);

  return (
    <StudentShell student={student} classId={classId} groupId={student.class.groupId} backHref={`/trida/${classId}`}>
      <PageTitle
        title={quiz.title}
        subtitle={
          <>
            {quiz.topic.title} · {plural(questions.length, ["otázka", "otázky", "otázek"])}
            {quiz.maxAttempts !== null && ` · pokus ${used + 1} z ${quiz.maxAttempts}`}
            {quiz.points > 0 && ` · až ⭐ ${quiz.points} b.`}
            {quiz.description && (
              <>
                <br />
                {quiz.description}
              </>
            )}
          </>
        }
      />
      <QuizRunner quizId={quiz.id} classId={classId} questions={questions} />
    </StudentShell>
  );
}
