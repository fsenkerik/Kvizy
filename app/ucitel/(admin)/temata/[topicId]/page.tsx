import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedTopic } from "@/lib/db/access";
import { deleteTopic, toggleTopicVisible, updateTopic } from "@/app/actions/topics";
import { createQuizFromHtml, createQuizFromJson, moveQuiz, toggleQuizOpen } from "@/app/actions/quizzes";
import { createLink, deleteLink, updateLink } from "@/app/actions/links";
import { PageTitle } from "@/components/shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { ActionForm } from "@/components/teacher/action-form";
import { ConfirmButton } from "@/components/teacher/confirm-button";
import { QuizJsonForm } from "@/components/teacher/quiz-json-form";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Téma" };

export default async function TopicPage(props: PageProps<"/ucitel/temata/[topicId]">) {
  const { topicId } = await props.params;
  const teacher = await requireTeacher();
  const topic = await getOwnedTopic(teacher.id, topicId);
  if (!topic) notFound();

  const db = await getDb();
  const [quizzes, links] = await Promise.all([
    db.query.quizzes.findMany({
      where: eq(schema.quizzes.topicId, topic.id),
      orderBy: [asc(schema.quizzes.sortOrder), asc(schema.quizzes.createdAt)],
      with: { attempts: { columns: { studentId: true } } },
    }),
    db.query.links.findMany({
      where: eq(schema.links.topicId, topic.id),
      orderBy: [asc(schema.links.sortOrder), asc(schema.links.createdAt)],
    }),
  ]);

  return (
    <>
      <p className="mb-2 text-sm text-muted">
        <Link href="/ucitel" className="hover:text-text">Skupiny</Link> /{" "}
        <Link href={`/ucitel/skupiny/${topic.groupId}`} className="hover:text-text">{topic.group.name}</Link> / {topic.title}
      </p>
      <PageTitle
        title={`${topic.weekNumber ? `${topic.weekNumber}. týden · ` : ""}${topic.title}`}
        subtitle={
          <>
            {topic.description}
            {!topic.isVisible && <Badge tone="warning" className="ml-2">skryté pro studenty</Badge>}
          </>
        }
        actions={
          <>
            <form action={toggleTopicVisible}>
              <input type="hidden" name="topicId" value={topic.id} />
              <Button variant="secondary" type="submit">
                {topic.isVisible ? "Skrýt studentům" : "Zobrazit studentům"}
              </Button>
            </form>
            <Dialog title="Upravit téma" trigger={<Button variant="secondary">Upravit</Button>}>
              <ActionForm action={updateTopic} closeDialogOnSuccess>
                <input type="hidden" name="topicId" value={topic.id} />
                <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
                  <Field label="Týden">
                    <Input name="weekNumber" type="number" min={1} max={60} defaultValue={topic.weekNumber ?? ""} />
                  </Field>
                  <Field label="Název">
                    <Input name="title" defaultValue={topic.title} required />
                  </Field>
                </div>
                <Field label="Popis">
                  <Textarea name="description" className="min-h-16" defaultValue={topic.description ?? ""} />
                </Field>
              </ActionForm>
              <form action={deleteTopic} className="mt-6 border-t border-border pt-4">
                <input type="hidden" name="topicId" value={topic.id} />
                <ConfirmButton variant="danger" size="sm" message={`Opravdu smazat téma „${topic.title}“ včetně kvízů, odkazů a výsledků?`}>
                  Smazat téma
                </ConfirmButton>
              </form>
            </Dialog>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Kvízy</h2>
            <div className="flex items-center gap-2">
            <Dialog title="Nahrát hotový HTML kvíz" trigger={<Button size="sm" variant="secondary">Nahrát HTML</Button>}>
              <p className="mb-3 text-sm text-muted">
                Vyber soubor <code>.html</code> s kvízem ve tvém původním formátu (např. <code>hardware_kviz.html</code>). Aplikace z něj
                otázky, správné odpovědi i vysvětlení přečte sama. Po nahrání zkontroluj otázky v detailu kvízu.
              </p>
              <ActionForm action={createQuizFromHtml} submitLabel="Nahrát a převést" resetOnSuccess closeDialogOnSuccess>
                <input type="hidden" name="topicId" value={topic.id} />
                <Field label="Soubor s kvízem">
                  <Input name="file" type="file" accept=".html,.htm,text/html" required className="file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-primary" />
                </Field>
              </ActionForm>
            </Dialog>
            <Dialog title="Přidat kvíz (JSON)" trigger={<Button size="sm">+ Kvíz</Button>}>
              <p className="mb-3 text-sm text-muted">
                Vlož JSON ve formátu popsaném v{" "}
                <a href="https://github.com/fsenkerik/Kvizy/blob/main/docs/format-kvizu.md" target="_blank" rel="noreferrer" className="underline">
                  docs/format-kvizu.md
                </a>
                . Kvíz se založí s nastavením 1 pokus + zobrazit odpovědi; upravíš ho v detailu.
              </p>
              <QuizJsonForm action={createQuizFromJson} hidden={{ topicId: topic.id }} submitLabel="Přidat kvíz" closeDialogOnSuccess />
            </Dialog>
            </div>
          </div>
          {quizzes.length === 0 && <EmptyState title="Žádný kvíz" hint="Nahraj hotový HTML kvíz nebo vlož JSON." />}
          <div className="space-y-2">
            {quizzes.map((q, i) => {
              const studentsDone = new Set(q.attempts.map((a) => a.studentId)).size;
              return (
                <Card key={q.id} className={!q.isOpen ? "opacity-60" : undefined}>
                  <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/ucitel/kvizy/${q.id}`} className="font-medium hover:text-primary">
                        {q.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {plural(q.questions.length, ["otázka", "otázky", "otázek"])} ·{" "}
                        {q.maxAttempts === null ? "neomezeně pokusů" : plural(q.maxAttempts, ["pokus", "pokusy", "pokusů"])} ·{" "}
                        {q.showAnswersAfter ? "zobrazuje odpovědi" : "bez odpovědí"} · ⭐ {q.points} b. · vyplnilo {studentsDone}
                        {!q.isOpen && " · uzavřeno"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <form action={moveQuiz}>
                        <input type="hidden" name="quizId" value={q.id} />
                        <input type="hidden" name="direction" value="up" />
                        <Button variant="ghost" size="sm" type="submit" disabled={i === 0} aria-label="Nahoru">↑</Button>
                      </form>
                      <form action={moveQuiz}>
                        <input type="hidden" name="quizId" value={q.id} />
                        <input type="hidden" name="direction" value="down" />
                        <Button variant="ghost" size="sm" type="submit" disabled={i === quizzes.length - 1} aria-label="Dolů">↓</Button>
                      </form>
                      <form action={toggleQuizOpen}>
                        <input type="hidden" name="quizId" value={q.id} />
                        <Button variant="secondary" size="sm" type="submit">
                          {q.isOpen ? "Uzavřít" : "Otevřít"}
                        </Button>
                      </form>
                      <Link href={`/ucitel/kvizy/${q.id}/vysledky`} className={buttonClass("secondary", "sm")}>
                        Výsledky
                      </Link>
                      <Link href={`/ucitel/kvizy/${q.id}`} className={buttonClass("primary", "sm")}>
                        Upravit
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cvičení a odkazy</h2>
            <Dialog title="Nový odkaz" trigger={<Button size="sm" variant="secondary">+ Odkaz</Button>}>
              <ActionForm action={createLink} submitLabel="Přidat" resetOnSuccess closeDialogOnSuccess>
                <input type="hidden" name="topicId" value={topic.id} />
                <Field label="Název">
                  <Input name="title" required autoFocus placeholder="Např. Cvičení: složky v OneDrive" />
                </Field>
                <Field label="Adresa (URL)">
                  <Input name="url" type="url" required placeholder="https://…" />
                </Field>
                <Field label="Popis (volitelné)">
                  <Textarea name="description" className="min-h-16" placeholder="Co má student udělat" />
                </Field>
                <Field label="Body za splnění" hint="Student je dostane, když odkaz otevře a zůstane u něj alespoň 45 s. 0 = bez bodů.">
                  <Input name="points" type="number" min={0} max={1000} defaultValue={5} className="w-24" />
                </Field>
              </ActionForm>
            </Dialog>
          </div>
          {links.length === 0 && <EmptyState title="Žádný odkaz" hint="Sem patří úkoly a cvičení mimo aplikaci." />}
          <div className="space-y-2">
            {links.map((l) => (
              <Card key={l.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary">
                      🔗 {l.title}
                    </a>
                    <p className="truncate text-xs text-muted">
                      {l.points > 0 ? `⭐ ${l.points} b. · ` : ""}
                      {l.description || l.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Dialog title="Upravit odkaz" trigger={<Button variant="ghost" size="sm">Upravit</Button>}>
                      <ActionForm action={updateLink} closeDialogOnSuccess>
                        <input type="hidden" name="linkId" value={l.id} />
                        <Field label="Název">
                          <Input name="title" defaultValue={l.title} required />
                        </Field>
                        <Field label="Adresa (URL)">
                          <Input name="url" type="url" defaultValue={l.url} required />
                        </Field>
                        <Field label="Popis">
                          <Textarea name="description" className="min-h-16" defaultValue={l.description ?? ""} />
                        </Field>
                        <Field label="Body za splnění">
                          <Input name="points" type="number" min={0} max={1000} defaultValue={l.points} className="w-24" />
                        </Field>
                      </ActionForm>
                    </Dialog>
                    <form action={deleteLink}>
                      <input type="hidden" name="linkId" value={l.id} />
                      <ConfirmButton variant="ghost" size="sm" className="text-danger-fg" message={`Smazat odkaz „${l.title}“?`}>
                        Smazat
                      </ConfirmButton>
                    </form>
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
