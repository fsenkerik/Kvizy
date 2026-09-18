"use client";

import { useEffect, useRef, useState } from "react";
import { usePoints } from "./points-context";

/**
 * Plynulé „napočítání“ čísla z předchozí na novou hodnotu.
 * Používá setInterval (ne requestAnimationFrame), aby doběhlo i v záložce na pozadí,
 * a na konci vždy doskočí na cílovou hodnotu.
 */
function useCountUp(value: number, duration = 900) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = Date.now();
    const id = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t >= 1) {
        window.clearInterval(id);
        fromRef.current = value;
        setShown(value);
      }
    }, 30);
    return () => {
      window.clearInterval(id);
      fromRef.current = value;
      setShown(value);
    };
  }, [value, duration]);
  return shown;
}

/** Odznak s body v hlavičce studenta: hvězdička, počet, ukazatel a „+N“ při přičtení. */
export function PointsBadge() {
  const { state } = usePoints();
  const shown = useCountUp(state.total);
  const percent = state.max > 0 ? Math.min(100, Math.round((state.total / state.max) * 100)) : 0;

  return (
    <div className="relative flex flex-col items-end gap-1" aria-live="polite">
      <div
        key={state.tick}
        className={`inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary ${state.tick > 0 && state.lastEarned > 0 ? "kv-pop" : ""}`}
        title={`Máš ${state.total} z ${state.max} momentálně dostupných bodů`}
      >
        <span aria-hidden>⭐</span>
        <span className="tabular-nums">{shown}</span>
        <span className="font-normal text-muted">b.</span>
      </div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${percent}%` }} />
      </div>
      {state.tick > 0 && state.lastEarned > 0 && (
        <span key={`float-${state.tick}`} className="kv-float-up pointer-events-none absolute -top-5 right-0 text-sm font-bold text-success-fg">
          +{state.lastEarned}
        </span>
      )}
    </div>
  );
}
