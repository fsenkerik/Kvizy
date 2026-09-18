import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireTeacher } from "@/lib/auth/guards";
import { getOwnedClass } from "@/lib/db/access";
import { PrintButton } from "@/components/teacher/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tisk PINů" };

/** Tisková stránka: kartičky se jménem a PINem k rozstříhání. */
export default async function PinPrintPage(props: PageProps<"/ucitel/tridy/[classId]/piny">) {
  const { classId } = await props.params;
  const teacher = await requireTeacher();
  const cls = await getOwnedClass(teacher.id, classId);
  if (!cls) notFound();

  const db = await getDb();
  const students = await db.query.students.findMany({
    where: eq(schema.students.classId, cls.id),
    orderBy: [asc(schema.students.lastName), asc(schema.students.firstName)],
  });
  const activeStudents = students.filter((s) => s.isActive);

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Vytiskni a rozstříhej. Každý student dostane svou kartičku.</p>
        <PrintButton />
      </div>
      <h1 className="mb-4 text-xl font-semibold">
        Třída {cls.name} – přihlašovací PINy
      </h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
        {activeStudents.map((s) => (
          <div key={s.id} className="rounded-xl border border-dashed border-border p-4 print:border-black">
            <p className="text-xs text-muted print:text-black">Kvízovna · {cls.name}</p>
            <p className="mt-1 font-semibold">
              {s.firstName} {s.lastName}
            </p>
            <p className="mt-2 font-mono text-2xl tracking-[0.3em]">{s.pin}</p>
            <p className="mt-2 break-all text-[10px] text-muted print:text-black">{process.env.NEXT_PUBLIC_APP_URL ?? ""}/trida/{cls.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
