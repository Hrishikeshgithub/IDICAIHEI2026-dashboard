"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { simulationTickAction, startSimulationAction, stopSimulationAction } from "@/app/(app)/simulation-actions";

const TICK_MS = 6000;

/**
 * Drives the demo simulation from the browser. It only runs while this tab is open and the
 * admin has pressed Start — nothing keeps writing to the database in the background.
 */
export function SimulationControl() {
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ticks, setTicks] = useState(0);
  const [error, setError] = useState<string>();
  const inFlight = useRef(false);

  const tick = useCallback(async () => {
    if (inFlight.current) return; // never overlap ticks
    inFlight.current = true;
    try {
      const r = await simulationTickAction();
      if (r.ok) { setTicks((n) => n + 1); setError(undefined); }
      else setError(r.error);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [running, tick]);

  async function toggle() {
    setBusy(true);
    setError(undefined);
    if (running) {
      setRunning(false);
      await stopSimulationAction();
    } else {
      const r = await startSimulationAction();
      if (r.ok) { setRunning(true); void tick(); }
      else setError(r.error);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60",
          running ? "glass text-slate-900" : "btn-accent",
        )}
      >
        {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        {busy ? "Working…" : running ? "Stop simulation" : "Start simulation"}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500" role="status">
        {error ? (
          <span className="text-red-600">{error}</span>
        ) : running ? (
          <>
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Live · {ticks} updates
          </>
        ) : (
          "Simulation stopped"
        )}
      </p>
    </div>
  );
}
