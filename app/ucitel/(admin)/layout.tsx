import type { ReactNode } from "react";
import { requireTeacher } from "@/lib/auth/guards";
import { teacherLogout } from "@/app/actions/auth";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { TeacherNav } from "@/components/teacher/nav";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const teacher = await requireTeacher();
  return (
    <Shell
      wide
      homeHref="/ucitel"
      right={
        <div className="flex items-center gap-3">
          <TeacherNav isAdmin={teacher.isAdmin} />
          <span className="hidden text-sm text-muted md:inline">{teacher.name}</span>
          <form action={teacherLogout}>
            <Button variant="ghost" size="sm" type="submit">
              Odhlásit
            </Button>
          </form>
        </div>
      }
    >
      {children}
    </Shell>
  );
}
