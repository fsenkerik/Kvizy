"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Jednoduchý dialog nad nativním <dialog>. Otevírá se tlačítkem `trigger`
 * nebo prop `open`, zavírá křížkem, klávesou Esc nebo kliknutím mimo.
 * Formulář uvnitř může po úspěchu zavolat closeParentDialog().
 */
export function Dialog({
  trigger,
  title,
  children,
  open,
  onClose,
}: {
  trigger?: ReactNode;
  title: string;
  children: ReactNode;
  open?: boolean;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (open === false && el.open) el.close();
  }, [open]);

  return (
    <>
      {trigger && <span onClick={() => ref.current?.showModal()}>{trigger}</span>}
      <dialog
        ref={ref}
        onClose={onClose}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[min(92vw,40rem)] rounded-card border border-border bg-surface p-0 text-text shadow-card backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button variant="ghost" size="sm" onClick={() => ref.current?.close()} aria-label="Zavřít">
              ✕
            </Button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}

/** Zavře nejbližší nadřazený <dialog> – používá se po úspěšném odeslání formuláře. */
export function closeParentDialog(el: HTMLElement | null) {
  el?.closest("dialog")?.close();
}
