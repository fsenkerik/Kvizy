import Link from "next/link";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { studentLogout } from "@/app/actions/auth";
import { getPointsSummary } from "@/lib/points";
import { PointsProvider } from "./points-context";
import { PointsBadge } from "./points-badge";

/**
 * Obal přihlášených studentských stránek: hlavička s body, jménem a odhlášením.
 * Body drží PointsProvider, aby se po odevzdání kvízu / splnění odkazu hned aktualizovaly.
 */
export async function StudentShell({
  student,
  classId,
  groupId,
  backHref,
  children,
}: {
  student: { id: string; firstName: string; lastName: string };
  classId: string;
  groupId: string;
  backHref?: string;
  children: ReactNode;
}) {
  const points = await getPointsSummary(student.id, groupId);
  return (
    <PointsProvider initial={points}>
      <Shell
        homeHref={`/trida/${classId}`}
        right={
          <div className="flex items-center gap-3">
            {backHref && (
              <Link href={backHref} className="hidden text-sm text-muted hover:text-text sm:inline">
                ← Témata
              </Link>
            )}
            <PointsBadge />
            <form action={studentLogout} className="flex items-center gap-2">
              <input type="hidden" name="classId" value={classId} />
              <span className="hidden text-sm text-muted md:inline">{student.firstName}</span>
              <Button variant="secondary" size="sm" type="submit">
                Odhlásit
              </Button>
            </form>
          </div>
        }
      >
        {children}
      </Shell>
    </PointsProvider>
  );
}
