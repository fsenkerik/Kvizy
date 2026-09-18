import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedClass } from "@/lib/db/access";
import { deleteClass, renameClass } from "@/app/actions/classes";
import { addStudents, deleteStudent, regeneratePin, renameStudent, toggleStudentActive } from "@/app/actions/students";
import { PageTitle } from "@/components/shell";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/teacher/action-form";
import { ConfirmButton } from "@/components/teacher/confirm-button";
import { PinReveal } from "@/components/teacher/pin-reveal";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Třída" };

export default async function ClassAdminPage(props: PageProps<"/ucitel/tridy/[classId]">) {
  const { classId } = await props.params;
  const teacher = await requireTeacher();
  const cls = await getOwnedClass(teacher.id, classId);
  if (!cls) notFound();

  const db = await getDb();
  const students = await db.query.students.findMany({
    where: eq(schema.students.classId, cls.id),
    orderBy: [asc(schema.students.lastName), asc(schema.students.firstName)],
  });

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/ucitel" className="hover:text-text">Skupiny</Link> /{" "}
        <Link href={`/ucitel/skupiny/${cls.groupId}`} className="hover:text-text">{cls.group.name}</Link> / {cls.name}
      </p>
      <PageTitle
        title={`Třída ${cls.name}`}
        subtitle={
          <>
            {plural(students.length, ["student", "studenti", "studentů"])} · odkaz pro studenty:{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">/trida/{cls.id}</code>
          </>
        }
        actions={
          <>
            <Link href={`/ucitel/tridy/${cls.id}/vysledky`} className={buttonClass("secondary")}>
              Výsledky
            </Link>
            <Link href={`/ucitel/tridy/${cls.id}/piny`} className={buttonClass("secondary")} target="_blank">
              Tisk PINů
            </Link>
            <Dialog title="Přidat studenty" trigger={<Button>+ Studenti</Button>}>
              <ActionForm action={addStudents} submitLabel="Přidat" resetOnSuccess closeDialogOnSuccess>
                <input type="hidden" name="classId" value={cls.id} />
                <Field label="Jména" hint="Každý student na vlastní řádek ve tvaru „Jméno Příjmení“. PIN se vygeneruje automaticky.">
                  <Textarea name="names" className="min-h-48" required autoFocus placeholder={"Jan Novák\nEva Svobodová"} />
                </Field>
              </ActionForm>
            </Dialog>
            <Dialog title="Upravit třídu" trigger={<Button variant="secondary">Upravit</Button>}>
              <ActionForm action={renameClass} closeDialogOnSuccess>
                <input type="hidden" name="classId" value={cls.id} />
                <Field label="Název třídy">
                  <Input name="name" defaultValue={cls.name} required />
                </Field>
              </ActionForm>
              <form action={deleteClass} className="mt-6 border-t border-border pt-4">
                <input type="hidden" name="classId" value={cls.id} />
                <ConfirmButton variant="danger" size="sm" message={`Opravdu smazat třídu ${cls.name} včetně studentů a jejich výsledků?`}>
                  Smazat třídu
                </ConfirmButton>
              </form>
            </Dialog>
          </>
        }
      />

      {students.length === 0 && <EmptyState title="Ve třídě zatím nikdo není" hint="Přidej studenty tlačítkem „+ Studenti“." />}

      {students.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Příjmení</th>
                <th className="px-4 py-2">Jméno</th>
                <th className="px-4 py-2">PIN</th>
                <th className="px-4 py-2">Stav</th>
                <th className="px-4 py-2 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id} className={!s.isActive ? "opacity-60" : undefined}>
                  <td className="px-4 py-2 font-medium">{s.lastName}</td>
                  <td className="px-4 py-2">{s.firstName}</td>
                  <td className="px-4 py-2">
                    <PinReveal pin={s.pin} />
                  </td>
                  <td className="px-4 py-2">
                    {!s.isActive ? (
                      <Badge>neaktivní</Badge>
                    ) : s.pinLockedUntil && s.pinLockedUntil > new Date() ? (
                      <Badge tone="warning">zamčeno</Badge>
                    ) : (
                      <Badge tone="success">aktivní</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Dialog title="Upravit studenta" trigger={<Button variant="ghost" size="sm">Upravit</Button>}>
                        <ActionForm action={renameStudent} closeDialogOnSuccess>
                          <input type="hidden" name="studentId" value={s.id} />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Jméno">
                              <Input name="firstName" defaultValue={s.firstName} required />
                            </Field>
                            <Field label="Příjmení">
                              <Input name="lastName" defaultValue={s.lastName} />
                            </Field>
                          </div>
                        </ActionForm>
                      </Dialog>
                      <form action={regeneratePin}>
                        <input type="hidden" name="studentId" value={s.id} />
                        <ConfirmButton variant="ghost" size="sm" message={`Vygenerovat nový PIN pro ${s.firstName} ${s.lastName}? Starý přestane platit.`}>
                          Nový PIN
                        </ConfirmButton>
                      </form>
                      <form action={toggleStudentActive}>
                        <input type="hidden" name="studentId" value={s.id} />
                        <Button variant="ghost" size="sm" type="submit">
                          {s.isActive ? "Deaktivovat" : "Aktivovat"}
                        </Button>
                      </form>
                      <form action={deleteStudent}>
                        <input type="hidden" name="studentId" value={s.id} />
                        <ConfirmButton variant="ghost" size="sm" className="text-danger-fg" message={`Smazat ${s.firstName} ${s.lastName} včetně výsledků?`}>
                          Smazat
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
