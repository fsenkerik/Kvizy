"use client";

import { useTheme } from "next-themes";

/**
 * Přepínač světlý/tmavý režim. Ikona se řídí CSS podle data-theme na <html>,
 * takže není potřeba čekat na hydrataci.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Přepnout světlý / tmavý režim"
      title="Světlý / tmavý režim"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-lg hover:bg-surface-2"
    >
      <span className="dark:hidden">🌙</span>
      <span className="hidden dark:inline">☀️</span>
    </button>
  );
}
