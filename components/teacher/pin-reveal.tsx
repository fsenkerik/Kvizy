"use client";

import { useState } from "react";

/** PIN skrytý za tečkami, zobrazí se po kliknutí. */
export function PinReveal({ pin }: { pin: string }) {
  const [shown, setShown] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShown((s) => !s)}
      className="rounded-lg bg-surface-2 px-2 py-1 font-mono tracking-widest hover:bg-border"
      title={shown ? "Skrýt PIN" : "Zobrazit PIN"}
    >
      {shown ? pin : "••••"}
    </button>
  );
}
