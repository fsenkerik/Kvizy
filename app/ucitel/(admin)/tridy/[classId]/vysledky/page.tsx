import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedClass } from "@/lib/db/access";
import { getClassResults, statFor } from "@/lib/db/results";
import { PageTitle } from "@/components/shell";
import { EmptyState } from "@/components/ui/empty";
import { ScoreCell } from "@/components/teacher/score-cell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Výsledky třídy" };

export default async function ClassResultsPage(props: PageProps<"/ucitel/tridy/[classId]/vysledky">) {
  const { classId } = await props.params;
  const teacher = await requireTeacher();
  const cls = await getOwnedClass(teacher.id, classId);
  if (!cls) notFound();

  const { students, quizzes, stats } = await getClassResults(cls.id, cls.groupId);

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/ucitel" className="hover:text-text">Skupiny</Link> /{" "}
        <Link href={`/ucitel/skupiny/${cls.groupId}`} className="hover:text-text">{cls.group.name}</Link> /{" "}
        <Link href={`/ucitel/tridy/${cls.id}`} className="hover:text-text">{cls.name}</Link> / Výsledky
      </p>
      <PageTitle title={`Výsledky – ${cls.name}`} subtitle="Nejlepší pokus každého studenta. Kliknutím na buňku otevřeš revizi." />

      {(students.length === 0 || quizzes.length === 0) && (
        <EmptyState title="Zatím není co zobrazit" hint="Potřebuješ alespoň jednoho studenta a jeden kvíz ve skupině." />
      )}

      {students.length > 0 && quizzes.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="sticky left-0 bg-surface-2 px-4 py-2 font-medium uppercase tracking-wide">Student</th>
                {quizzes.map((q) => (
                  <th key={q.id} className="px-3 py-2 font-medium">
                    <Link href={`/ucitel/kvizy/${q.id}/vysledky`} className="hover:text-text">
                      <span className="block text-[10px] uppercase tracking-wide">{q.weekNumber ? `${q.weekNumber}. týden` : q.topicTitle}</span>
                      {q.title}
                    </Link>
                  </th>
                ))}
                <th className="px-3 py-2 font-medium uppercase tracking-wide">Průměr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => {
                const percents = quizzes.map((q) => statFor(stats, s.id, q.id).best?.percent).filter((p): p is number => p !== undefined);
                const avg = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null;
                return (
                  <tr key={s.id} className={!s.isActive ? "opacity-60" : undefined}>
                    <td className="sticky left-0 bg-surface px-4 py-2 font-medium">
                      {s.lastName} {s.firstName}
                    </td>
                    {quizzes.map((q) => (
                      <td key={q.id} className="px-3 py-2">
                        <ScoreCell stat={statFor(stats, s.id, q.id)} />
                      </td>
                    ))}
                    <td className="px-3 py-2 font-medium">{avg === null ? "–" : `${avg} %`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
