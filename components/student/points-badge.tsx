"use client";

import { useEffect, useRef, useState } from "react";
import { usePoints } from "./points-context";

/**
 * Plynulé „napočítání“ čísla. Při načtení stránky startuje z nuly (efekt načítání),
 * potom vždy z předchozí hodnoty. Používá setInterval (ne requestAnimationFrame),
 * aby doběhlo i v záložce na pozadí, a na konci vždy doskočí na cílovou hodnotu.
 */
function useCountUp(value: number, duration: number) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
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

/**
 * Bodový widget uprostřed hlavičky studenta: hvězdička + počet bodů, pod tím ukazatel
 * s leskem a procenta z momentálně dostupných bodů. Při přičtení bodů „pípne“ (+N), zvětší se a zazáří.
 */
export function PointsWidget() {
  const { state } = usePoints();
  const shown = useCountUp(state.total, state.tick === 0 ? 1200 : 900);
  const percent = state.max > 0 ? Math.min(100, Math.round((shown / state.max) * 100)) : 0;
  const bump = state.tick > 0 && state.lastEarned > 0;
  const [floatVisible, setFloatVisible] = useState(false);

  // „+N“ se ukáže jen na chvíli a pak z DOM zmizí (funguje i bez CSS animací).
  useEffect(() => {
    if (!bump) return;
    const show = window.setTimeout(() => setFloatVisible(true), 0);
    const hide = window.setTimeout(() => setFloatVisible(false), 1700);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [bump, state.tick]);

  return (
    <div
      key={state.tick}
      className={`relative flex min-w-44 flex-col items-center rounded-2xl bg-primary-soft px-4 py-1.5 ${bump ? "kv-pop kv-glow" : ""}`}
      title={`Máš ${state.total} z ${state.max} momentálně dostupných bodů`}
      aria-live="polite"
    >
      <div className="flex items-baseline gap-1.5 leading-none">
        <span className="text-lg" aria-hidden>⭐</span>
        <span className="text-2xl font-bold tabular-nums text-primary">{shown}</span>
        <span className="text-sm text-muted">b.</span>
        {floatVisible && (
          <span className="kv-float-up pointer-events-none absolute -right-2 top-0 rounded-full bg-success-bg px-2 py-0.5 text-sm font-bold text-success-fg">
            +{state.lastEarned}
          </span>
        )}
      </div>
      <div className="mt-1 flex w-full items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface/70" aria-hidden>
          <div className="kv-bar-fill h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
        </div>
        <span className="w-9 text-right text-xs font-semibold tabular-nums text-muted">{percent} %</span>
      </div>
    </div>
  );
}
