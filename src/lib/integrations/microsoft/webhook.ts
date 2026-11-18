import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMicrosoftConfig } from "./config";
import { changeNotificationCollectionSchema, type ChangeNotification } from "./contracts";
import { createProviderLogger } from "./logger";

export const MAX_BODY_BYTES = 1_000_000;

/** Constant-time comparison so the clientState secret cannot be recovered by timing. */
export function clientStateMatches(received: string | undefined, expected: string): boolean {
  if (!received) return false;
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Stable key used for duplicate-event protection. Lifecycle notifications carry no id of their own. */
export function eventKey(n: ChangeNotification): string {
  if (n.id) return `change:${n.subscriptionId}:${n.id}`;
  const raw = [n.subscriptionId, n.lifecycleEvent, n.subscriptionExpirationDateTime].join("|");
  return `lifecycle:${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
}

export type IntakeResult =
  | { ok: true; accepted: number; duplicates: number; rejected: number }
  | { ok: false; status: 400; reason: string };

/**
 * Validates and ENQUEUES notifications. It does no Graph calls and no heavy work: Graph needs a 2xx
 * within 3 seconds, so real processing happens later in processPendingEvents().
 */
export async function intakeNotifications(db: SupabaseClient, rawBody: string): Promise<IntakeResult> {
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) return { ok: false, status: 400, reason: "Body too large" };

  let json: unknown;
  try { json = JSON.parse(rawBody); } catch { return { ok: false, status: 400, reason: "Invalid JSON" }; }
  const parsed = changeNotificationCollectionSchema.safeParse(json);
  if (!parsed.success) return { ok: false, status: 400, reason: "Unexpected payload shape" };

  const { webhookClientState } = getMicrosoftConfig();
  const log = createProviderLogger(db);

  const valid: ChangeNotification[] = [];
  let rejected = 0;
  for (const n of parsed.data.value) {
    if (clientStateMatches(n.clientState, webhookClientState)) valid.push(n);
    else rejected++;
  }
  if (rejected > 0) await log("warn", "Rejected notifications with invalid clientState", { rejected });

  let accepted = 0;
  let duplicates = 0;
  if (valid.length) {
    const rows = valid.map((n) => ({
      provider: "microsoft_teams",
      external_event_id: eventKey(n),
      event_kind: n.lifecycleEvent ? "lifecycle" : "change",
      subscription_id: n.subscriptionId,
      resource: n.resource ?? null,
      change_type: n.changeType ?? n.lifecycleEvent ?? null,
      // The shared secret must never be stored.
      payload: { ...n, clientState: undefined },
    }));
    const { data, error } = await db
      .from("provider_events")
      .upsert(rows, { onConflict: "provider,external_event_id", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error("Failed to enqueue notifications"); // -> 5xx so Graph retries
    accepted = data?.length ?? 0;
    duplicates = valid.length - accepted;
  }
  return { ok: true, accepted, duplicates, rejected };
}
