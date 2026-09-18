import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { Shell } from "@/components/shell";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";

export const dynamic = "force-dynamic";

const LEVELS: { key: "nizsi" | "vyssi"; label: string }[] = [
  { key: "nizsi", label: "Nižší gymnázium" },
  { key: "vyssi", label: "Vyšší gymnázium" },
];

export default async function HomePage() {
  const db = await getDb();
  const groups = await db.query.groups.findMany({
    orderBy: [asc(schema.groups.sortOrder), asc(schema.groups.createdAt)],
    with: {
      classes: { orderBy: [asc(schema.classes.sortOrder), asc(schema.classes.createdAt)] },
      teacher: { columns: { name: true } },
    },
  });
  const teacherCount = new Set(groups.map((g) => g.teacherId)).size;
  const anyClass = groups.some((g) => g.classes.length > 0);

  return (
    <Shell right={<Link href="/ucitel" className="text-sm text-muted hover:text-text">Učitel</Link>}>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Vyber svou třídu</h1>
        <p className="mt-2 text-muted">Klikni na třídu, vyber své jméno a zadej PIN.</p>
      </div>

      {!anyClass && <EmptyState title="Zatím tu nejsou žádné třídy" hint="Učitel je založí v administraci." />}

      <div className="space-y-8">
        {LEVELS.map((level) => {
          const levelGroups = groups.filter((g) => g.level === level.key && g.classes.length > 0);
          if (levelGroups.length === 0) return null;
          return (
            <section key={level.key}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{level.label}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {levelGroups.flatMap((g) =>
                  g.classes.map((c) => (
                    <Link key={c.id} href={`/trida/${c.id}`} className="group">
                      <Card className="h-full transition-transform group-hover:-translate-y-0.5 group-hover:border-primary">
                        <CardBody className="flex flex-col items-center justify-center py-6 text-center">
                          <span className="text-2xl font-semibold">{c.name}</span>
                          <span className="mt-1 text-xs text-muted">
                            {g.name}
                            {teacherCount > 1 ? ` · ${g.teacher.name}` : ""}
                          </span>
                        </CardBody>
                      </Card>
                    </Link>
                  )),
                )}
              </div>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}
