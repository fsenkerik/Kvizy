"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/** Pole nastavení kvízu: pokusy, zobrazení odpovědí, otevřeno. */
export function QuizSettingsFields({
  maxAttempts,
  showAnswersAfter,
  isOpen,
}: {
  maxAttempts: number | null;
  showAnswersAfter: boolean;
  isOpen: boolean;
}) {
  const initialMode = maxAttempts === null ? "unlimited" : maxAttempts === 1 ? "one" : "custom";
  const [mode, setMode] = useState(initialMode);

  const radio = (value: string, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="radio" name="attemptsMode" value={value} checked={mode === value} onChange={() => setMode(value)} className="accent-[var(--primary)]" />
      {label}
    </label>
  );

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Počet pokusů</legend>
        {radio("one", "Jen jeden pokus")}
        {radio("unlimited", "Neomezeně (procvičování)")}
        <div className="flex items-center gap-2">
          {radio("custom", "Vlastní počet:")}
          <Input name="maxAttempts" type="number" min={1} max={99} defaultValue={maxAttempts ?? 3} className="w-20" disabled={mode !== "custom"} />
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="showAnswersAfter" defaultChecked={showAnswersAfter} className="accent-[var(--primary)]" />
        Po odevzdání zobrazit správné odpovědi a vysvětlení
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isOpen" defaultChecked={isOpen} className="accent-[var(--primary)]" />
        Kvíz je otevřený (studenti ho vidí a mohou vyplňovat)
      </label>
    </div>
  );
}
