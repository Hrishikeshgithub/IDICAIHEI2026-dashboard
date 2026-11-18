import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMicrosoftConfig } from "./config";
import { createSubscriptionBody, subscriptionSchema } from "./contracts";
import { graphFetch, type GraphLogger } from "./graph-client";

const NOTIFICATION_PATH = "/api/webhooks/microsoft";

/**
 * Creates a Graph subscription and records it. Graph validates the notification URL (it must be
 * public https and answer the validationToken handshake) before it creates the subscription, so this
 * cannot succeed from localhost. Which resources support subscriptions, and their maximum lifetime,
 * is resource-specific — verify in the Microsoft docs before choosing `resource`.
 */
export async function createSubscription(db: SupabaseClient, log: GraphLogger, input: { resource: string; changeType: string }) {
  const cfg = getMicrosoftConfig();
  const url = `${cfg.notificationBaseUrl}${NOTIFICATION_PATH}`;
  const expiration = new Date(Date.now() + cfg.subscriptionLifetimeMinutes * 60_000).toISOString();

  const sub = subscriptionSchema.parse(
    await graphFetch("/subscriptions", {
      method: "POST",
      body: createSubscriptionBody({
        resource: input.resource, changeType: input.changeType, notificationUrl: url, lifecycleNotificationUrl: url,
        expirationDateTime: expiration, clientState: cfg.webhookClientState,
      }),
    }, log),
  );
  const { error } = await db.from("integration_subscriptions").insert({
    provider: "microsoft_teams", subscription_id: sub.id, resource: sub.resource, change_type: sub.changeType, expires_at: sub.expirationDateTime,
  });
  if (error) throw new Error("Subscription created in Graph but could not be recorded");
  return sub;
}

/**
 * Renews one subscription. A single PATCH both renews and reauthorizes; per Microsoft, never send
 * /reauthorize and PATCH for the same subscription within 10 minutes.
 */
export async function renewSubscription(db: SupabaseClient, log: GraphLogger, subscriptionId: string) {
  const cfg = getMicrosoftConfig();
  const expiration = new Date(Date.now() + cfg.subscriptionLifetimeMinutes * 60_000).toISOString();
  try {
    const sub = subscriptionSchema.parse(
      await graphFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "PATCH", body: { expirationDateTime: expiration } }, log),
    );
    await db.from("integration_subscriptions")
      .update({ expires_at: sub.expirationDateTime, last_renewed_at: new Date().toISOString(), status: "active", last_error: null })
      .eq("subscription_id", subscriptionId);
    return true;
  } catch (e) {
    await db.from("integration_subscriptions")
      .update({ status: "error", last_error: e instanceof Error ? e.message.slice(0, 300) : "renewal failed" })
      .eq("subscription_id", subscriptionId);
    await log("error", "Subscription renewal failed", { subscriptionId });
    return false;
  }
}

/** Renews every active subscription that expires within `withinHours`. */
export async function renewExpiringSubscriptions(db: SupabaseClient, log: GraphLogger, withinHours = 12) {
  const cutoff = new Date(Date.now() + withinHours * 3_600_000).toISOString();
  const { data } = await db.from("integration_subscriptions").select("subscription_id").eq("status", "active").lt("expires_at", cutoff);
  let renewed = 0;
  for (const s of data ?? []) if (await renewSubscription(db, log, s.subscription_id)) renewed++;
  return { due: data?.length ?? 0, renewed };
}
