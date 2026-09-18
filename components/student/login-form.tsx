"use client";

import { useActionState, useMemo, useState } from "react";
import { studentLogin } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type StudentOption = { id: string; name: string };

export function StudentLoginForm({ classId, students }: { classId: string; students: StudentOption[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StudentOption | null>(null);
  const [state, action, pending] = useActionState(studentLogin, undefined);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students;
  }, [query, students]);

  if (!selected) {
    return (
      <div className="space-y-3">
        <Input
          placeholder="Hledat jméno…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="Hledat jméno"
        />
        <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-surface">
          {filtered.length === 0 && <p className="p-4 text-sm text-muted">Nikdo nenalezen.</p>}
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className="block w-full px-4 py-3 text-left hover:bg-surface-2 focus:bg-surface-2"
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={selected.id} />
      <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
        <span className="font-medium">{selected.name}</span>
        <button type="button" onClick={() => setSelected(null)} className="text-sm text-muted hover:text-text">
          Změnit
        </button>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">PIN</span>
        <Input
          name="pin"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="off"
          autoFocus
          required
          placeholder="••••"
          className={cn("text-center text-2xl tracking-[0.5em]")}
        />
      </label>
      {state?.error && <Alert>{state.error}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Přihlašuji…" : "Přihlásit se"}
      </Button>
    </form>
  );
}
