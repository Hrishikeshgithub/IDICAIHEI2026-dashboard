"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { ensureBaseline } from "@/lib/simulation/baseline";
import { runSimulationTick, type TickSummary } from "@/lib/simulation/engine";

export type SimResult = { ok: true; summary?: TickSummary } | { ok: false; error: string };

export async function startSimulationAction(): Promise<SimResult> {
  const user = await requireSuperAdmin();
  const supabase = await createClient();
  try {
    const backfilled = await ensureBaseline(supabase);
    await logAudit(supabase, user.id, "simulation_start", "simulation", null, { backfilled });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start the simulation." };
  }
}

export async function stopSimulationAction(): Promise<SimResult> {
  const user = await requireSuperAdmin();
  const supabase = await createClient();
  await logAudit(supabase, user.id, "simulation_stop", "simulation");
  return { ok: true };
}

export async function simulationTickAction(): Promise<SimResult> {
  await requireSuperAdmin();
  const supabase = await createClient();
  try {
    return { ok: true, summary: await runSimulationTick(supabase) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Simulation tick failed." };
  }
}
