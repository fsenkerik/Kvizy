import Link from "next/link";
import { redirect } from "next/navigation";
import { currentTeacher } from "@/lib/auth/guards";
import { Shell } from "@/components/shell";
import { TeacherLoginForm } from "@/components/teacher/login-form";

export const metadata = { title: "Přihlášení učitele" };

export default async function TeacherLoginPage() {
  if (await currentTeacher()) redirect("/ucitel");
  return (
    <Shell>
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">Přihlášení učitele</h1>
        <TeacherLoginForm />
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/" className="hover:text-text">← Zpět pro studenty</Link>
        </p>
      </div>
    </Shell>
  );
}
