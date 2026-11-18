import type { SupabaseClient } from "@supabase/supabase-js";
import { fakePerson } from "./names";

const MIN = 60_000;

interface MeetingLite {
  id: string;
  meeting_status: string;
  expected_participants: number;
  current_participants: number;
  coordinator_present: boolean;
  actual_start_time: string | null;
  actual_end_time: string | null;
  venues: { coordinators: { full_name: string; email: string } | null } | null;
}

/**
 * Seeded meetings carry counts but no attendee rows. Before the first tick we backfill participant
 * rows so counts, attendance reports and the participant table agree. Idempotent: meetings that
 * already have rows are skipped.
 */
export async function ensureBaseline(db: SupabaseClient): Promise<number> {
  const { data, error } = await db
    .from("meetings")
    .select("id, meeting_status, expected_participants, current_participants, coordinator_present, actual_start_time, actual_end_time, venues(coordinators(full_name, email))")
    .eq("data_source", "simulated")
    .neq("meeting_status", "scheduled");
  if (error) throw new Error("Could not load meetings for simulation.");

  const meetings = data as unknown as MeetingLite[];
  let inserted = 0;

  for (const m of meetings) {
    const { count } = await db.from("meeting_participants").select("id", { count: "exact", head: true }).eq("meeting_id", m.id);
    if (count && count > 0) continue;

    const now = Date.now();
    const rows: Record<string, unknown>[] = [];
    const start = m.actual_start_time ? new Date(m.actual_start_time).getTime() : now - 5 * MIN;
    const coordinator = m.venues?.coordinators;
    const ended = m.meeting_status === "ended";
    const end = m.actual_end_time ? new Date(m.actual_end_time).getTime() : now;

    if (coordinator && (m.coordinator_present || ended)) {
      rows.push({
        meeting_id: m.id, participant_name: coordinator.full_name, participant_email: coordinator.email, is_coordinator: true,
        joined_at: new Date(start).toISOString(), left_at: ended ? new Date(end).toISOString() : null, data_source: "simulated",
      });
    }

    const attendees = ended ? Math.round(m.expected_participants * 0.85) : m.current_participants;
    for (let i = 0; i < attendees; i++) {
      const p = fakePerson();
      const joined = start + Math.random() * Math.max(MIN, (ended ? 20 * MIN : now - start));
      rows.push({
        meeting_id: m.id, participant_name: p.name, participant_email: p.email, is_coordinator: false,
        joined_at: new Date(joined).toISOString(),
        left_at: ended ? new Date(end - Math.random() * 20 * MIN).toISOString() : null,
        data_source: "simulated",
      });
    }

    for (let i = 0; i < rows.length; i += 200) {
      const { error: insErr } = await db.from("meeting_participants").insert(rows.slice(i, i + 200));
      if (insErr) throw new Error("Could not create baseline participants.");
    }
    inserted += rows.length;
  }
  return inserted;
}
