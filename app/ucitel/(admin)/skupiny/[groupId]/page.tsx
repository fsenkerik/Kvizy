import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedGroup } from "@/lib/db/access";
import { deleteGroup, updateGroup } from "@/app/actions/groups";
import { createClass } from "@/app/actions/classes";
import { createTopic, moveTopic, toggleTopicVisible } from "@/app/actions/topics";
import { PageTitle } from "@/components/shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { ActionForm } from "@/components/teacher/action-form";
import { ConfirmButton } from "@/components/teacher/confirm-button";
import { LEVEL_LABEL } from "@/lib/labels";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Skupina" };

export default async function GroupPage(props: PageProps<"/ucitel/skupiny/[groupId]">) {
  const { groupId } = await props.params;
  const teacher = await requireTeacher();
  const group = await getOwnedGroup(teacher.id, groupId);
  if (!group) notFound();

  const db = await getDb();
  const [classes, topics] = await Promise.all([
    db.query.classes.findMany({
      where: eq(schema.classes.groupId, group.id),
      orderBy: [asc(schema.classes.sortOrder), asc(schema.classes.createdAt)],
      with: { students: { columns: { id: true } } },
    }),
    db.query.topics.findMany({
      where: eq(schema.topics.groupId, group.id),
      orderBy: [asc(schema.topics.sortOrder), asc(schema.topics.createdAt)],
      with: { quizzes: { columns: { id: true } }, links: { columns: { id: true } } },
    }),
  ]);

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/ucitel" className="hover:text-text">Skupiny</Link> / {group.name}
      </p>
      <PageTitle
        title={group.name}
        subtitle={<Badge tone={group.level === "nizsi" ? "mint" : "sky"}>{LEVEL_LABEL[group.level]}</Badge>}
        actions={
          <>
            <Dialog title="Upravit skupinu" trigger={<Button variant="secondary">Upravit</Button>}>
              <ActionForm action={updateGroup} closeDialogOnSuccess>
                <input type="hidden" name="groupId" value={group.id} />
                <Field label="Název">
                  <Input name="name" defaultValue={group.name} required />
                </Field>
                <Field label="Úroveň">
                  <Select name="level" defaultValue={group.level}>
                    <option value="nizsi">Nižší gymnázium</option>
                    <option value="vyssi">Vyšší gymnázium</option>
                  </Select>
                </Field>
              </ActionForm>
              <form action={deleteGroup} className="mt-6 border-t border-border pt-4">
                <input type="hidden" name="groupId" value={group.id} />
                <ConfirmButton variant="danger" size="sm" message={`Opravdu smazat skupinu „${group.name}“ včetně všech tříd, studentů, témat, kvízů a výsledků?`}>
                  Smazat skupinu
                </ConfirmButton>
              </form>
            </Dialog>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Třídy</h2>
            <Dialog title="Nová třída" trigger={<Button size="sm" variant="secondary">+ Třída</Button>}>
              <ActionForm action={createClass} submitLabel="Přidat" resetOnSuccess closeDialogOnSuccess>
                <input type="hidden" name="groupId" value={group.id} />
                <Field label="Název třídy" hint="Např. 1.AV, 5.AV, 1.A">
                  <Input name="name" required autoFocus />
                </Field>
              </ActionForm>
            </Dialog>
          </div>
          {classes.length === 0 && <EmptyState title="Žádná třída" hint="Přidej třídu, aby se studenti mohli přihlásit." />}
          <div className="space-y-2">
            {classes.map((c) => (
              <Link key={c.id} href={`/ucitel/tridy/${c.id}`} className="block">
                <Card className="transition-colors hover:border-primary">
                  <CardBody className="flex items-center justify-between py-3">
                    <span className="text-lg font-semibold">{c.name}</span>
                    <span className="text-sm text-muted">{plural(c.students.length, ["student", "studenti", "studentů"])}</span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Témata</h2>
            <Dialog title="Nové téma" trigger={<Button size="sm">+ Téma</Button>}>
              <ActionForm action={createTopic} submitLabel="Vytvořit">
                <input type="hidden" name="groupId" value={group.id} />
                <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
                  <Field label="Týden">
                    <Input name="weekNumber" type="number" min={1} max={60} />
                  </Field>
                  <Field label="Název">
                    <Input name="title" required autoFocus placeholder="Např. Hardware" />
                  </Field>
                </div>
                <Field label="Popis (volitelné)">
                  <Textarea name="description" className="min-h-16" />
                </Field>
              </ActionForm>
            </Dialog>
          </div>
          {topics.length === 0 && <EmptyState title="Žádné téma" hint="Téma sdružuje kvízy a odkazy na cvičení k jedné látce." />}
          <div className="space-y-2">
            {topics.map((t, i) => (
              <Card key={t.id} className={!t.isVisible ? "opacity-60" : undefined}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/ucitel/temata/${t.id}`} className="font-medium hover:text-primary">
                      {t.weekNumber ? <span className="text-muted">{t.weekNumber}. týden · </span> : null}
                      {t.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {plural(t.quizzes.length, ["kvíz", "kvízy", "kvízů"])} · {plural(t.links.length, ["odkaz", "odkazy", "odkazů"])}
                      {!t.isVisible && " · skryté pro studenty"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <form action={moveTopic}>
                      <input type="hidden" name="topicId" value={t.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button variant="ghost" size="sm" type="submit" disabled={i === 0} aria-label="Nahoru">↑</Button>
                    </form>
                    <form action={moveTopic}>
                      <input type="hidden" name="topicId" value={t.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button variant="ghost" size="sm" type="submit" disabled={i === topics.length - 1} aria-label="Dolů">↓</Button>
                    </form>
                    <form action={toggleTopicVisible}>
                      <input type="hidden" name="topicId" value={t.id} />
                      <Button variant="secondary" size="sm" type="submit">
                        {t.isVisible ? "Skrýt" : "Zobrazit"}
                      </Button>
                    </form>
                    <Link href={`/ucitel/temata/${t.id}`} className={buttonClass("primary", "sm")}>
                      Otevřít
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
