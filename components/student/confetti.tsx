"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

const COLORS = ["var(--primary)", "var(--mint)", "var(--peach)", "var(--sky)", "var(--lavender)", "var(--warning-fg)"];

/** Deterministické částice pro daný seed (čistá funkce mimo render kvůli pravidlům hooků). */
function makePieces(pieces: number, seed: number) {
  const state = { x: seed * 9301 + 49297 };
  const rnd = () => {
    state.x = (state.x * 9301 + 49297) % 233280;
    return state.x / 233280;
  };
  return Array.from({ length: pieces }, (_, i) => ({
    id: i,
    left: `${Math.round(rnd() * 100)}%`,
    drift: `${Math.round(rnd() * 120 - 60)}px`,
    fall: `${Math.round(220 + rnd() * 220)}px`,
    rot: `${Math.round(rnd() * 900 - 450)}deg`,
    dur: `${(1.6 + rnd() * 1.2).toFixed(2)}s`,
    delay: `${Math.round(rnd() * 500)}ms`,
    color: COLORS[i % COLORS.length],
    round: rnd() > 0.7,
  }));
}

/**
 * Konfety padající přes celou šířku rodiče (ten musí mít `relative`).
 * Po ~3 s se komponenta sama odstraní, takže nic nezůstane viset ani bez CSS animací.
 */
export function Confetti({ pieces = 60, seed = 1 }: { pieces?: number; seed?: number }) {
  const items = useMemo(() => makePieces(pieces, seed), [pieces, seed]);
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setAlive(false), 3200);
    return () => window.clearTimeout(id);
  }, []);

  if (!alive) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-card" aria-hidden>
      {items.map((p) => (
        <span
          key={p.id}
          className="kv-confetti-piece"
          style={
            {
              left: p.left,
              background: p.color,
              borderRadius: p.round ? "50%" : "2px",
              "--drift": p.drift,
              "--fall": p.fall,
              "--rot": p.rot,
              "--dur": p.dur,
              "--delay": p.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
