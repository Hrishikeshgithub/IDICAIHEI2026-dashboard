import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GraphLogger } from "./graph-client";

/** Provider-specific log (table provider_logs). Context must never contain tokens or secrets. */
export function createProviderLogger(db: SupabaseClient): GraphLogger {
  return async (level, message, context = {}) => {
    const { error } = await db.from("provider_logs").insert({ provider: "microsoft_teams", level, message, context });
    if (error) console.error("provider log failed", error.message);
  };
}
