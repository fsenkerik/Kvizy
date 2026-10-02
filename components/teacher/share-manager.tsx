"use client";

import { shareGroup, unshareGroup, updateShareRole } from "@/app/actions/shares";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { ActionForm } from "./action-form";
import { ConfirmButton } from "./confirm-button";

type TeacherInfo = { id: string; name: string; email: string };
type Share = { teacherId: string; role: "edit" | "view"; teacher: TeacherInfo };

const ROLE_LABEL = { edit: "Plný přístup", view: "Jen prohlížení" } as const;

/** Správa sdílení skupiny – vidí a mění jen vlastník. */
export function ShareManager({
  groupId,
  shares,
  candidates,
}: {
  groupId: string;
  shares: Share[];
  candidates: TeacherInfo[];
}) {
  return (
    <div className="space-y-4">
      {shares.length === 0 && (
        <p className="text-sm text-muted">
          Skupinu zatím nikomu nesdílíš. Kolega, kterému ji nasdílíš, uvidí její třídy, studenty, témata, kvízy i výsledky.
        </p>
      )}

      {shares.length > 0 && (
        <ul className="space-y-2">
          {shares.map((s) => (
            <li key={s.teacherId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5">
              <div className="min-w-0">
                <p className="font-medium">{s.teacher.name}</p>
                <p className="text-xs text-muted">{s.teacher.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={s.role === "edit" ? "primary" : "neutral"}>{ROLE_LABEL[s.role]}</Badge>
                <form action={updateShareRole} className="flex items-center gap-1">
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="teacherId" value={s.teacherId} />
                  <input type="hidden" name="role" value={s.role === "edit" ? "view" : "edit"} />
                  <Button variant="secondary" size="sm" type="submit">
                    {s.role === "edit" ? "Omezit na prohlížení" : "Dát plný přístup"}
                  </Button>
                </form>
                <form action={unshareGroup}>
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="teacherId" value={s.teacherId} />
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    className="text-danger-fg"
                    message={`Zrušit sdílení skupiny s ${s.teacher.name}? Ztratí k ní přístup, data zůstanou tobě.`}
                  >
                    Zrušit sdílení
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {candidates.length > 0 ? (
        <ActionForm action={shareGroup} submitLabel="Nasdílet" resetOnSuccess>
          <input type="hidden" name="groupId" value={groupId} />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Učitel">
              <Select name="teacherId" defaultValue="">
                <option value="" disabled>
                  — vyber kolegu —
                </option>
                {candidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Oprávnění">
              <Select name="role" defaultValue="edit">
                <option value="edit">Plný přístup</option>
                <option value="view">Jen prohlížení</option>
              </Select>
            </Field>
          </div>
        </ActionForm>
      ) : (
        <p className="text-sm text-muted">
          {shares.length > 0 ? "Všem ostatním učitelům už skupinu sdílíš." : "Zatím tu není žádný další učitel – účty přidáš v sekci Učitelé."}
        </p>
      )}
    </div>
  );
}
