"use client";

import { useState, type ReactNode } from "react";
import { cn, plural } from "@/lib/utils";

/**
 * Přepínač mezi náhledem kvízu (vyplňování jako student) a editorem otázek.
 * Obě části vykresluje server, tady jen přepínáme, co je vidět – po úpravě
 * otázky tak zůstaneš v editoru a můžeš se hned podívat na výsledek v náhledu.
 */
export function PreviewTabs({
  runner,
  editor,
  questionCount,
  defaultTab = "nahled",
}: {
  runner: ReactNode;
  editor: ReactNode;
  questionCount: number;
  defaultTab?: "nahled" | "upravy";
}) {
  const [tab, setTab] = useState<"nahled" | "upravy">(defaultTab);

  const tabClass = (active: boolean) =>
    cn(
      "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
      active ? "bg-primary text-primary-fg shadow-sm" : "bg-surface-2 text-muted hover:text-text",
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={tabClass(tab === "nahled")} onClick={() => setTab("nahled")} disabled={questionCount === 0}>
          👁 Náhled
        </button>
        <button type="button" className={tabClass(tab === "upravy")} onClick={() => setTab("upravy")}>
          ✏️ Upravit otázky
        </button>
        <span className="text-sm text-muted">{questionCount === 0 ? "kvíz zatím nemá otázky" : `${plural(questionCount, ["otázka", "otázky", "otázek"])} v kvízu`}</span>
      </div>
      <div className={tab === "nahled" ? undefined : "hidden"}>{runner}</div>
      <div className={tab === "upravy" ? undefined : "hidden"}>{editor}</div>
    </div>
  );
}
