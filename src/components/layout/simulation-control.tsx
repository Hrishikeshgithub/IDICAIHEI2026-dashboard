"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center gap-2">
      <Button size="sm" variant={running ? "outline" : "default"} onClick={toggle} disabled={busy}>
        {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        {running ? "Stop simulation" : "Start simulation"}
      </Button>
      <span className="hidden text-xs text-slate-500 lg:inline" role="status">
        {error ? <span className="text-red-600">{error}</span> : running ? `Running · ${ticks} updates` : "Stopped"}
      </span>
    </div>
  );
}
