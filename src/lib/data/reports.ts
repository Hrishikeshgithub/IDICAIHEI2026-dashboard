import { createClient } from "@/lib/supabase/server";
import type { Category, MeetingStatus } from "@/lib/types";
import type { VenueFilters } from "@/lib/data/queries";

export interface AttendanceSummary {
  meeting_id: string;
  venue_id: string;
  venue_code: string;
  venue_name: string;
  category: Category;
  location: string;
  meeting_title: string;
  meeting_status: MeetingStatus;
  start_time: string;
  end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  expected_participants: number;
  current_participants: number;
  data_source: string;
  total_attendees: number;
  avg_duration_seconds: number | null;
  coordinator_first_joined: string | null;
  coordinator_seconds: number;
  coordinator_sessions: number;
}

export interface AttendanceRow {
  id: string;
  participant_name: string;
  participant_email: string | null;
  is_coordinator: boolean;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
  data_source: string;
}

export async function getAttendanceSummaries(filters: VenueFilters = {}): Promise<AttendanceSummary[]> {
  const supabase = await createClient();
  let q = supabase.from("attendance_summary").select("*").order("venue_code");
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.status) q = q.eq("meeting_status", filters.status);
  const { data, error } = await q;
  if (error) throw new Error("Failed to load attendance summary");

  let rows = data as AttendanceSummary[];
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    rows = rows.filter((r) => [r.venue_name, r.venue_code, r.location, r.meeting_title].some((s) => s.toLowerCase().includes(needle)));
  }
  return rows;
}

export async function getAttendanceSummary(meetingId: string): Promise<AttendanceSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("attendance_summary").select("*").eq("meeting_id", meetingId).maybeSingle();
  return (data as AttendanceSummary) ?? null;
}

const COLUMNS = "id, participant_name, participant_email, is_coordinator, joined_at, left_at, duration_seconds, data_source";

/** First `limit` attendance rows for on-screen viewing. */
export async function getAttendanceRows(meetingId: string, limit = 200): Promise<{ rows: AttendanceRow[]; total: number }> {
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("meeting_participants")
    .select(COLUMNS, { count: "exact" })
    .eq("meeting_id", meetingId)
    .order("joined_at")
    .limit(limit);
  return { rows: (data ?? []) as AttendanceRow[], total: count ?? 0 };
}

/** Every attendance row for export, fetched in pages to get past the API's 1000-row cap. */
export async function getAllAttendanceRows(meetingId: string): Promise<AttendanceRow[]> {
  const supabase = await createClient();
  const all: AttendanceRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("meeting_participants")
      .select(COLUMNS)
      .eq("meeting_id", meetingId)
      .order("joined_at")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error("Failed to load attendance");
    all.push(...((data ?? []) as AttendanceRow[]));
    if (!data || data.length < PAGE) break;
  }
  return all;
}
