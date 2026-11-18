import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getAllAttendanceRows, getAttendanceSummaries, getAttendanceSummary } from "@/lib/data/reports";
import { parseVenueFilters } from "@/lib/filters";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { istStamp, minutes, toCsv } from "@/lib/csv";

const idSchema = z.uuid();

function csvResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * GET /reports/export            -> venue-wise attendance summary (honours the page filters)
 * GET /reports/export?meeting=ID -> participant-level attendance for one meeting
 * Authorization is the caller's session + RLS: coordinators can only export their own venue.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const stamp = new Date().toISOString().slice(0, 10);
  const meetingParam = url.searchParams.get("meeting");

  if (meetingParam) {
    const id = idSchema.safeParse(meetingParam);
    if (!id.success) return new Response("Bad request", { status: 400 });
    const summary = await getAttendanceSummary(id.data);
    if (!summary) return new Response("Not found", { status: 404 });
    const rows = await getAllAttendanceRows(id.data);

    const header = ["Venue ID", "Venue", "Meeting", "Participant", "Email", "Role", "Joined (IST)", "Left (IST)", "Duration (min)", "Data source"];
    const body = rows.map((r) => [
      summary.venue_code, summary.venue_name, summary.meeting_title, r.participant_name, r.participant_email,
      r.is_coordinator ? "Coordinator" : "Participant", istStamp(r.joined_at), istStamp(r.left_at),
      minutes(r.duration_seconds ?? Math.floor((Date.now() - new Date(r.joined_at).getTime()) / 1000)),
      r.data_source,
    ]);
    return csvResponse(toCsv(header, body), `attendance-${summary.venue_code}-${stamp}.csv`);
  }

  const summaries = await getAttendanceSummaries(parseVenueFilters(Object.fromEntries(url.searchParams)));
  const header = [
    "Venue ID", "Venue", "Category", "Location", "Meeting", "Status", "Scheduled start (IST)", "Scheduled end (IST)",
    "Actual start (IST)", "Actual end (IST)", "Expected participants", "Current participants", "Total attendees",
    "Avg participation (min)", "Coordinator first joined (IST)", "Coordinator time (min)", "Data source",
  ];
  const body = summaries.map((s) => [
    s.venue_code, s.venue_name, CATEGORY_LABELS[s.category], s.location, s.meeting_title, STATUS_LABELS[s.meeting_status],
    istStamp(s.start_time), istStamp(s.end_time), istStamp(s.actual_start_time), istStamp(s.actual_end_time),
    s.expected_participants, s.current_participants, s.total_attendees, minutes(s.avg_duration_seconds),
    istStamp(s.coordinator_first_joined), minutes(s.coordinator_seconds), s.data_source,
  ]);
  return csvResponse(toCsv(header, body), `attendance-summary-${stamp}.csv`);
}
