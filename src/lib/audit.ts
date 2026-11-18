import type { SupabaseClient } from "@supabase/supabase-js";

/** Records an administrative action. Never throws: auditing must not break the action itself. */
export async function logAudit(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    details,
  });
  if (error) console.error("audit log failed", error.message);
}
