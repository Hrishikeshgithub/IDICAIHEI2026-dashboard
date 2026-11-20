"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { checkConnection, linkTeamsMeetings, syncAttendance, type SyncResult } from "@/lib/integrations/microsoft/sync";

async function run(action: string, fn: (db: Awaited<ReturnType<typeof createClient>>) => Promise<SyncResult>): Promise<SyncResult> {
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

export const testMicrosoftConnectionAction = () => run("teams_test_connection", checkConnection);
export const linkTeamsMeetingsAction = () => run("teams_link_meetings", linkTeamsMeetings);
export const syncTeamsAttendanceAction = () => run("teams_sync_attendance", syncAttendance);
