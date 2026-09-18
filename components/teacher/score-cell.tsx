import Link from "next/link";
import type { StudentQuizStat } from "@/lib/db/results";
import { cn } from "@/lib/utils";

/** Buňka s nejlepším výsledkem – podbarvená podle procent, proklik na revizi pokusu. */
export function ScoreCell({ stat }: { stat: StudentQuizStat }) {
  if (!stat.best) return <span className="text-muted">–</span>;
  const p = stat.best.percent;
  return (
    <Link
      href={`/ucitel/pokusy/${stat.best.attemptId}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium hover:brightness-95",
        p >= 75 ? "bg-success-bg text-success-fg" : p >= 50 ? "bg-warning-bg text-warning-fg" : "bg-danger-bg text-danger-fg",
      )}
      title={`${stat.best.score} / ${stat.best.maxScore}, pokusů: ${stat.count}`}
    >
      {p} %{stat.count > 1 && <span className="text-[10px] opacity-70">×{stat.count}</span>}
    </Link>
  );
}
