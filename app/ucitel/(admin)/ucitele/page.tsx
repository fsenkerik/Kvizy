import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { createTeacher, deleteTeacher } from "@/app/actions/teachers";
import { PageTitle } from "@/components/shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { ActionForm } from "@/components/teacher/action-form";
import { ConfirmButton } from "@/components/teacher/confirm-button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Učitelé" };

export default async function TeachersPage() {
  const admin = await requireAdmin();
  const db = await getDb();
  const teachers = await db.query.teachers.findMany({
    orderBy: [asc(schema.teachers.name)],
    with: { groups: { columns: { id: true } } },
  });

  return (
    <>
      <PageTitle
        title="Učitelé"
        subtitle="Každý učitel vidí jen své skupiny. Registrace není veřejná – účty zakládáš tady."
        actions={
          <Dialog title="Nový učitel" trigger={<Button>+ Učitel</Button>}>
            <ActionForm action={createTeacher} submitLabel="Vytvořit účet" resetOnSuccess>
              <Field label="Jméno">
                <Input name="name" required autoFocus />
              </Field>
              <Field label="E-mail">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Heslo" hint="Alespoň 8 znaků. Předej ho kolegovi, změní si ho v Profilu.">
                <Input name="password" type="text" required minLength={8} autoComplete="off" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isAdmin" className="accent-[var(--primary)]" />
                Administrátor (může spravovat učitele)
              </label>
            </ActionForm>
          </Dialog>
        }
      />

      <div className="space-y-2">
        {teachers.map((t) => (
          <Card key={t.id}>
            <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  {t.name} {t.isAdmin && <Badge tone="primary" className="ml-1">admin</Badge>}
                  {t.id === admin.id && <Badge className="ml-1">ty</Badge>}
                </p>
                <p className="text-xs text-muted">
                  {t.email} · {t.groups.length} skupin · od {formatDate(t.createdAt)}
                </p>
              </div>
              {t.id !== admin.id && (
                <form action={deleteTeacher}>
                  <input type="hidden" name="teacherId" value={t.id} />
                  <ConfirmButton variant="danger" size="sm" message={`Opravdu smazat účet ${t.email} včetně všech jeho skupin, tříd a výsledků?`}>
                    Smazat
                  </ConfirmButton>
                </form>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
