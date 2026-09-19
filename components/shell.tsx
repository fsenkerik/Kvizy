import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

/**
 * Společný obal stránky: hlavička s názvem, volitelným středem (např. body studenta),
 * obsahem vpravo a přepínačem tématu. Na mobilu se střed přesune na vlastní řádek.
 */
export function Shell({
  children,
  center,
  right,
  homeHref = "/",
  wide = false,
}: {
  children: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  homeHref?: string;
  wide?: boolean;
}) {
  const width = wide ? "max-w-6xl" : "max-w-3xl";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print border-b border-border bg-surface/80 backdrop-blur">
        <div className={`mx-auto grid items-center gap-x-4 gap-y-2 px-4 py-2 ${width} grid-cols-[auto_1fr] sm:grid-cols-[1fr_auto_1fr]`}>
          <Link href={homeHref} className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg text-sm">K</span>
            Kvízovna
          </Link>
          {center && <div className="order-3 col-span-2 flex justify-center sm:order-none sm:col-span-1">{center}</div>}
          <div className="flex items-center justify-end gap-3 sm:col-start-3">
            {right}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${width}`}>{children}</main>
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
