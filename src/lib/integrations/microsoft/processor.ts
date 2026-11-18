import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GraphLogger } from "./graph-client";
import { renewSubscription } from "./subscriptions";

const MAX_ATTEMPTS = 5;
const BATCH = 25;

interface EventRow {
  id: string;
  event_kind: "change" | "lifecycle";
  subscription_id: string | null;
  resource: string | null;
  change_type: string | null;
  attempts: number;
  payload: { lifecycleEvent?: string };
}

/**
 * Handles one queued event. Returns normally on success; throws to schedule a retry.
 * Lifecycle events are handled for real. Resource change events are NOT yet mapped to dashboard
 * updates — the exact resources and payloads depend on what Microsoft supports for the chosen
 * subscription types, which needs a real tenant to confirm. They are acknowledged and logged only.
 */
async function handle(db: SupabaseClient, log: GraphLogger, e: EventRow): Promise<string | null> {
  if (e.event_kind === "lifecycle") {
    const kind = e.payload.lifecycleEvent;
    if (kind === "reauthorizationRequired" && e.subscription_id) {
      if (!(await renewSubscription(db, log, e.subscription_id))) throw new Error("renewal failed");
      return null;
    }
    if (kind === "subscriptionRemoved" && e.subscription_id) {
      await db.from("integration_subscriptions").update({ status: "removed" }).eq("subscription_id", e.subscription_id);
      await log("warn", "Subscription removed by Microsoft; it must be recreated", { subscriptionId: e.subscription_id });
      return null;
    }
    if (kind === "missed") {
      await log("warn", "Microsoft reported missed notifications; a resync is required", { subscriptionId: e.subscription_id });
      return null;
    }
  }
  return "no handler implemented for this resource yet";
}

export async function processPendingEvents(db: SupabaseClient, log: GraphLogger) {
  const { data } = await db
    .from("provider_events")
    .select("id, event_kind, subscription_id, resource, change_type, attempts, payload")
    .is("processed_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("received_at")
    .limit(BATCH);

  let processed = 0;
  let failed = 0;
  for (const e of (data ?? []) as EventRow[]) {
    try {
      const note = await handle(db, log, e);
      await db.from("provider_events").update({ processed_at: new Date().toISOString(), attempts: e.attempts + 1, last_error: note }).eq("id", e.id);
      processed++;
    } catch (err) {
      await db.from("provider_events").update({ attempts: e.attempts + 1, last_error: err instanceof Error ? err.message.slice(0, 300) : "error" }).eq("id", e.id);
      failed++;
    }
  }
  return { processed, failed };
}
