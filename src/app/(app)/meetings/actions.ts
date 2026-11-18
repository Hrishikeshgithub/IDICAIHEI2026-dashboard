"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { dbMessage, firstError, meetingSchema } from "@/lib/validation";
import { getMeetingProvider } from "@/lib/providers";

export interface FormState { error?: string }

export async function createMeetingAction(_p: FormState | undefined, fd: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const parsed = meetingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  // One meeting per venue keeps the monitoring grid unambiguous.
  const existing = await supabase.from("meetings").select("id", { count: "exact", head: true }).eq("venue_id", parsed.data.venue_id);
  if (existing.count && existing.count > 0) return { error: "This venue already has a meeting. Edit it instead." };

  // The active provider supplies the external id and, when none was typed, a join URL.
  let provider;
  let created;
  try {
    provider = await getMeetingProvider(supabase);
    created = await provider.createMeeting({
      title: parsed.data.meeting_title, startTime: parsed.data.start_time, endTime: parsed.data.end_time,
    });
  } catch (e) {
    console.error("meeting provider failed", e instanceof Error ? e.message : e);
    return { error: "The meeting provider could not create the meeting. Check the integration settings." };
  }
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      ...parsed.data,
      join_url: parsed.data.join_url ?? created.joinUrl,
      external_meeting_id: created.externalMeetingId,
      meeting_provider: provider.name,
      data_source: provider.simulated ? "simulated" : "provider",
    })
    .select("id").single();
  if (error) return { error: dbMessage(error, "Could not create the meeting.") };

  await logAudit(supabase, user.id, "create", "meeting", data.id, parsed.data);
  revalidatePath("/", "layout");
  redirect("/meetings");
}

export async function updateMeetingAction(id: string, _p: FormState | undefined, fd: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const parsed = meetingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").update(parsed.data).eq("id", id);
  if (error) return { error: dbMessage(error, "Could not update the meeting.") };

  await logAudit(supabase, user.id, "update", "meeting", id, parsed.data);
  revalidatePath("/", "layout");
  redirect("/meetings");
}

export async function deleteMeetingAction(id: string) {
  const user = await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return;
  await logAudit(supabase, user.id, "delete", "meeting", id);
  revalidatePath("/", "layout");
}
