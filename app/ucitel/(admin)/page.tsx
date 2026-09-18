import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireTeacher } from "@/lib/auth/guards";
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



export default async function TeacherHomePage() {
  const teacher = await requireTeacher();
  const db = await getDb();
  const groups = await db.query.groups.findMany({
    where: eq(schema.groups.teacherId, teacher.id),
    orderBy: [asc(schema.groups.sortOrder), asc(schema.groups.createdAt)],
    with: {
      classes: { orderBy: [asc(schema.classes.sortOrder)], columns: { id: true, name: true } },
      topics: { columns: { id: true } },
    },
  });

  return (
    <>
      <PageTitle
        title="Skupiny tříd"
        subtitle="Skupina sdílí témata a kvízy; třídy v ní jsou jednotlivé kolektivy studentů."
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
                  {g.classes.length > 0 ? g.classes.map((c) => c.name).join(", ") : "bez tříd"} ·{" "}
                  {plural(g.topics.length, ["téma", "témata", "témat"])}
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
