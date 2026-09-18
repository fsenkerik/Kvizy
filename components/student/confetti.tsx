"use client";

import { useMemo } from "react";

const COLORS = ["var(--primary)", "var(--mint)", "var(--peach)", "var(--sky)", "var(--lavender)", "var(--success-fg)"];

/** Deterministické částice pro daný seed (čistá funkce mimo render kvůli pravidlům hooků). */
function makePieces(pieces: number, seed: number) {
  const state = { x: seed * 9301 + 49297 };
  const rnd = () => {
    state.x = (state.x * 9301 + 49297) % 233280;
    return state.x / 233280;
  };
  return Array.from({ length: pieces }, (_, i) => {
    const angle = rnd() * Math.PI * 2;
    const dist = 80 + rnd() * 160;
    return {
      id: i,
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - 40}px`,
      rot: `${Math.round(rnd() * 720 - 360)}deg`,
      color: COLORS[i % COLORS.length],
      delay: `${Math.round(rnd() * 120)}ms`,
    };
  });
}

/** Jednorázový „výbuch“ konfet z CSS – bez knihoven. Vykresli uvnitř prvku s `relative`. */
export function Confetti({ pieces = 28, seed = 1 }: { pieces?: number; seed?: number }) {
  const items = useMemo(() => makePieces(pieces, seed), [pieces, seed]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {items.map((p) => (
        <span
          key={p.id}
          className="kv-confetti-piece"
          style={{ "--dx": p.dx, "--dy": p.dy, "--rot": p.rot, background: p.color, animationDelay: p.delay } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
