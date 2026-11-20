"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { checkConnection, linkTeamsMeetings, syncAttendance, type SyncResult } from "@/lib/integrations/microsoft/sync";

type Db = Awaited<ReturnType<typeof createClient>>;

// Note: a "use server" file may only export async functions, so the shared helper is not exported.
async function run(action: string, fn: (db: Db) => Promise<SyncResult>): Promise<SyncResult> {
  const user = await requireSuperAdmin();
  const supabase = await createClient();
  try {
    const result = await fn(supabase);
    await logAudit(supabase, user.id, action, "integration", "microsoft_teams", { ok: result.ok });
    revalidatePath("/", "layout");
    return result;
  } catch (e) {
    console.error(action, e instanceof Error ? e.message : e);
    return { ok: false, lines: ["Unexpected error. Check the server logs."] };
  }
}

export async function testMicrosoftConnectionAction(): Promise<SyncResult> {
  return run("teams_test_connection", checkConnection);
}
export async function linkTeamsMeetingsAction(): Promise<SyncResult> {
  return run("teams_link_meetings", linkTeamsMeetings);
}
export async function syncTeamsAttendanceAction(): Promise<SyncResult> {
  return run("teams_sync_attendance", syncAttendance);
}
