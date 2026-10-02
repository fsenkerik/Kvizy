import Link from "next/link";
import { requireTeacher } from "@/lib/auth/guards";
import { listAccessibleGroups } from "@/lib/db/access";
import { createGroup } from "@/app/actions/groups";
import { PageTitle } from "@/components/shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { ActionForm } from "@/components/teacher/action-form";
import { plural } from "@/lib/utils";
import { LEVEL_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Skupiny" };



type GroupCard = Awaited<ReturnType<typeof listAccessibleGroups>>[number];

function GroupGrid({ groups }: { groups: GroupCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <Link key={g.id} href={`/ucitel/skupiny/${g.id}`} className="group">
          <Card className="h-full transition-colors group-hover:border-primary">
            <CardBody>
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{g.name}</h2>
                <Badge tone={g.level === "nizsi" ? "mint" : "sky"}>{LEVEL_LABEL[g.level]}</Badge>
              </div>
              <p className="text-sm text-muted">
                {g.classes.length > 0
                  ? [...g.classes].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.name).join(", ")
                  : "bez tříd"}{" "}
                · {plural(g.topics.length, ["téma", "témata", "témat"])}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {g.access.isOwner ? (
                  g.shares.length > 0 && <Badge tone="primary">sdílíš {g.shares.length}×</Badge>
                ) : (
                  <>
                    <Badge tone="lavender">od {g.teacher.name}</Badge>
                    {!g.access.canEdit && <Badge tone="warning">jen prohlížení</Badge>}
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function TeacherHomePage() {
  const teacher = await requireTeacher();
  const groups = await listAccessibleGroups(teacher.id);
  const own = groups.filter((g) => g.access.isOwner);
  const shared = groups.filter((g) => !g.access.isOwner);

  return (
    <>
      <PageTitle
        title="Skupiny tříd"
        subtitle="Skupina sdružuje témata, kvízy a třídy. Můžeš ji nasdílet kolegovi – v detailu skupiny."
        actions={
          <Dialog title="Nová skupina" trigger={<Button>+ Nová skupina</Button>}>
            <ActionForm action={createGroup} submitLabel="Vytvořit">
              <Field label="Název" hint="Např. „Prima“ nebo „1. ročník + kvinta“">
                <Input name="name" required autoFocus />
              </Field>
              <Field label="Úroveň">
                <Select name="level" defaultValue="nizsi">
                  <option value="nizsi">Nižší gymnázium</option>
                  <option value="vyssi">Vyšší gymnázium</option>
                </Select>
              </Field>
            </ActionForm>
          </Dialog>
        }
      />

      {groups.length === 0 && <EmptyState title="Zatím nemáš žádnou skupinu" hint="Začni tlačítkem „Nová skupina“ vpravo nahoře." />}

      {own.length > 0 && <GroupGrid groups={own} />}

      {shared.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Nasdílené mně</h2>
          <GroupGrid groups={shared} />
        </section>
      )}
    </>
  );
}
