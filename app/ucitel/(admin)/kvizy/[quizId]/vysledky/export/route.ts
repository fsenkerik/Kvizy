import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedQuiz } from "@/lib/db/access";
import { getQuizResults, statFor } from "@/lib/db/results";
import { formatDate } from "@/lib/utils";

/** CSV pro Excel (UTF-8 s BOM, středník jako oddělovač). */
export async function GET(_request: Request, ctx: RouteContext<"/ucitel/kvizy/[quizId]/vysledky/export">) {
  const { quizId } = await ctx.params;
  const teacher = await requireTeacher();
  const quiz = await getOwnedQuiz(teacher.id, quizId);
  if (!quiz) return new Response("Nenalezeno", { status: 404 });

  const { classes, stats } = await getQuizResults(quiz.id, quiz.topic.groupId);
  const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: string[] = [["Třída", "Příjmení", "Jméno", "Nejlepší body", "Max", "Nejlepší %", "Pokusů", "Poslední odevzdání"].map(esc).join(";")];
  for (const cls of classes) {
    for (const s of cls.students) {
      const stat = statFor(stats, s.id, quiz.id);
      rows.push(
        [cls.name, s.lastName, s.firstName, stat.best?.score ?? "", stat.best?.maxScore ?? "", stat.best?.percent ?? "", stat.count, stat.last ? formatDate(stat.last.submittedAt) : ""]
          .map(esc)
          .join(";"),
      );
    }
  }
  const filename = `vysledky-${quiz.title.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.csv`;
  return new Response("\uFEFF" + rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
