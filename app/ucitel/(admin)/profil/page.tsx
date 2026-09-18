import { requireTeacher } from "@/lib/auth/guards";
import { changePassword } from "@/app/actions/teachers";
import { PageTitle } from "@/components/shell";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { ActionForm } from "@/components/teacher/action-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const teacher = await requireTeacher();
  return (
    <>
      <PageTitle title="Profil" subtitle={`${teacher.name} · ${teacher.email}`} />
      <Card className="max-w-md">
        <CardBody>
          <h2 className="mb-4 text-lg font-semibold">Změna hesla</h2>
          <ActionForm action={changePassword} submitLabel="Změnit heslo" resetOnSuccess>
            <Field label="Současné heslo">
              <Input name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="Nové heslo" hint="Alespoň 8 znaků">
              <Input name="next" type="password" autoComplete="new-password" required minLength={8} />
            </Field>
            <Field label="Nové heslo znovu">
              <Input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
            </Field>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
