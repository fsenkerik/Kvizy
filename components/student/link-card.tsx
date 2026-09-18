"use client";

import { useEffect, useRef, useState } from "react";
import { completeLinkVisit, startLinkVisit } from "@/app/actions/link-visits";
import { Button } from "@/components/ui/button";
import { usePoints } from "./points-context";

type Status = "idle" | "waiting" | "claiming" | "done" | "error";

/**
 * Karta odkazu na cvičení. Po kliknutí se odkaz otevře v nové záložce a běží odpočet;
 * po jeho uplynutí si karta vyžádá body ze serveru (ten čas ověří).
 */
export function LinkCard({
  link,
  completed,
}: {
  link: { id: string; title: string; url: string; description: string | null; points: number };
  completed: boolean;
}) {
  const { award } = usePoints();
  const [status, setStatus] = useState<Status>(completed ? "done" : "idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  async function open() {
    window.open(link.url, "_blank", "noopener,noreferrer");
    if (status === "done" || link.points === 0) return;
    const res = await startLinkVisit(link.id);
    if (!res.ok) { setStatus("error"); setMessage(res.error); return; }
    if (res.completed) { setStatus("done"); return; }
    setStatus("waiting");
    setSecondsLeft(res.waitSeconds);
    const end = Date.now() + res.waitSeconds * 1000;
    timer.current = window.setInterval(async () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left > 0) return;
      window.clearInterval(timer.current!);
      timer.current = null;
      setStatus("claiming");
      const done = await completeLinkVisit(link.id);
      if (!done.ok) { setStatus("error"); setMessage(done.error); return; }
      setStatus("done");
      if (!done.alreadyCompleted && done.earned > 0) award({ ...done.points, earned: done.earned });
    }, 500);
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">🔗 {link.title}</p>
        {link.description && <p className="text-xs text-muted">{link.description}</p>}
        <p className="mt-0.5 text-xs">
          {status === "done" && link.points > 0 && <span className="font-medium text-success-fg">✓ Splněno · +{link.points} b.</span>}
          {status === "idle" && link.points > 0 && <span className="text-muted">Otevři a zůstaň chvíli u cvičení: +{link.points} b.</span>}
          {status === "waiting" && <span className="text-primary">Body se přičtou za {secondsLeft} s… (nech tuhle stránku otevřenou)</span>}
          {status === "claiming" && <span className="text-primary">Přičítám body…</span>}
          {status === "error" && <span className="text-danger-fg">{message}</span>}
        </p>
      </div>
      <Button variant={status === "done" ? "secondary" : "primary"} size="sm" onClick={open} disabled={status === "waiting" || status === "claiming"}>
        {status === "done" ? "Otevřít znovu ↗" : "Otevřít ↗"}
      </Button>
    </li>
  );
}
