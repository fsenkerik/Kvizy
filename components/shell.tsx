import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

/** Společný obal stránky: hlavička s názvem, volitelným obsahem vpravo a přepínačem tématu. */
export function Shell({
  children,
  right,
  homeHref = "/",
  wide = false,
}: {
  children: ReactNode;
  right?: ReactNode;
  homeHref?: string;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print border-b border-border bg-surface/80 backdrop-blur">
        <div className={`mx-auto flex h-14 items-center justify-between gap-4 px-4 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
          <Link href={homeHref} className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg text-sm">K</span>
            Kvízovna
          </Link>
          <div className="flex items-center gap-3">
            {right}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>{children}</main>
      <footer className="no-print py-6 text-center text-xs text-muted">Kvízovna · školní kvízy</footer>
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
