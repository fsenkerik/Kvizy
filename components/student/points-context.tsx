"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { PointsSummary } from "@/lib/points";

type Award = PointsSummary & { earned: number };

type PointsState = PointsSummary & {
  /** Poslední přírůstek – hlavička ho zobrazí jako „+N“ a přehraje animaci. */
  lastEarned: number;
  /** Mění se s každým přičtením, aby se animace spustila i při stejné hodnotě. */
  tick: number;
};

const PointsContext = createContext<{ state: PointsState; award: (a: Award) => void } | null>(null);

export function PointsProvider({ initial, children }: { initial: PointsSummary; children: ReactNode }) {
  const [state, setState] = useState<PointsState>({ ...initial, lastEarned: 0, tick: 0 });
  const award = useCallback((a: Award) => {
    setState((s) => ({ total: a.total, max: a.max, lastEarned: a.earned, tick: s.tick + 1 }));
  }, []);
  return <PointsContext.Provider value={{ state, award }}>{children}</PointsContext.Provider>;
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) throw new Error("usePoints musí být uvnitř PointsProvider");
  return ctx;
}
