import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthStatus, MeetingStatus } from "@/lib/types";
import { SESSIONS, TRACK_NAMES, type SessionDef } from "./schedule-data";

/**
 * Demo seed built from the programme schedule (src/lib/simulation/schedule-data.ts).
 * Everything written here is tagged data_source = 'simulated' and the join URLs point at a reserved
 * .invalid domain, so nothing can pass for real Teams data.
 *
 * Timing: the programme times (14:00, 09:00 ...) are kept as text in `meetings.schedule`, but the real
 * start/end timestamps are shifted so that "now" falls inside Day 1 Session 1. That keeps statuses
 * coherent (Day 1 in progress, Day 2 upcoming) whenever the demo data is created.
 */

const MIN = 60_000;
const ANCHOR_MINUTES_AGO = 50; // Day 1 14:00 programme time = 50 minutes before seeding

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

/** Programme time on a given day -> offset in minutes from "Day 1 14:00". */
const offsetMinutes = (day: 1 | 2, hhmm: string) => toMinutes(hhmm) - toMinutes("14:00") + (day === 2 ? 24 * 60 : 0);

const slug = (name: string) =>
  name.toLowerCase().replace(/\b(dr|mr|ms|prof)\.?\s/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

function sessionWindow(s: SessionDef, now: number) {
  const anchor = now - ANCHOR_MINUTES_AGO * MIN;
  const first = s.blocks[0]!;
  const last = s.blocks[s.blocks.length - 1]!;
  return {
    start: anchor + offsetMinutes(s.day, first.start) * MIN,
    end: anchor + offsetMinutes(s.day, last.end) * MIN,
  };
}

function demoState(s: SessionDef, start: number, now: number, expected: number) {
  const rand = (lo: number, hi: number) => Math.floor(lo + Math.random() * (hi - lo));
  const status: MeetingStatus = s.status;
  switch (status) {
    case "live": return { count: rand(Math.round(expected * 0.55), Math.round(expected * 0.9)), coord: true, health: "good" as HealthStatus, actualStart: start + 2 * MIN };
    case "technical_issue": return { count: rand(8, 24), coord: true, health: "poor" as HealthStatus, actualStart: start + 3 * MIN };
    case "starting": return { count: rand(3, 14), coord: true, health: "unknown" as HealthStatus, actualStart: null };
    case "waiting": return { count: rand(0, 8), coord: false, health: "unknown" as HealthStatus, actualStart: null };
    default: return { count: 0, coord: false, health: "unknown" as HealthStatus, actualStart: null };
  }
}

export async function resetDemoData(supabase: SupabaseClient) {
  // Cascades remove venues, meetings, participants, events, metrics and notifications.
  const a = await supabase.from("conferences").delete().not("id", "is", null);
  if (a.error) throw new Error(`Reset failed: ${a.error.message}`);
  const b = await supabase.from("coordinators").delete().eq("data_source", "simulated");
  if (b.error) throw new Error(`Reset failed: ${b.error.message}`);
}

export async function seedDemoData(supabase: SupabaseClient): Promise<{ venues: number; coordinators: number }> {
  const { count } = await supabase.from("venues").select("id", { count: "exact", head: true });
  if (count && count > 0) throw new Error("Demo data already exists. Reset it first to reseed.");

  const now = Date.now();
  const day1 = new Date(now).toISOString().slice(0, 10);
  const day2 = new Date(now + 24 * 60 * MIN).toISOString().slice(0, 10);

  const conf = await supabase
    .from("conferences")
    .insert({ name: "IDICAIHEI-2026 (Demo)", conference_date: day1, start_date: day1, end_date: day2, status: "active", demo_mode: true })
    .select("id")
    .single();
  if (conf.error) throw new Error(`Seed failed: ${conf.error.message}`);

  // One coordinator record per rapporteur; the same person can run several sessions.
  const names = [...new Set(SESSIONS.map((s) => s.rapporteur))];
  const coords = await supabase
    .from("coordinators")
    .insert(
      names.map((full_name, i) => ({
        full_name,
        email: `${slug(full_name)}@demo.example.org`,
        phone: `+91 90000 ${String(20000 + i)}`,
        account_status: "active",
        is_connected: false,
        data_source: "simulated",
      })),
    )
    .select("id, full_name");
  if (coords.error) throw new Error(`Seed failed: ${coords.error.message}`);
  const coordByName = new Map(coords.data.map((c) => [c.full_name, c.id]));

  const venues = await supabase
    .from("venues")
    .insert(
      SESSIONS.map((s) => ({
        conference_id: conf.data.id,
        venue_code: s.code,
        venue_name: s.venue,
        category: s.track,
        location: `${s.floor} · FEAT, Wardha`,
        coordinator_id: coordByName.get(s.rapporteur),
        mode: s.mode,
        floor: s.floor,
        subtrack: s.subtrack,
        session_chairs: s.chairs,
        day_number: s.day,
      })),
    )
    .select("id, venue_code");
  if (venues.error) throw new Error(`Seed failed: ${venues.error.message}`);
  const venueByCode = new Map(venues.data.map((v) => [v.venue_code, v.id]));

  const meetingRows = SESSIONS.map((s) => {
    const { start, end } = sessionWindow(s, now);
    const papers = s.blocks.reduce((n, b) => n + b.papers.length, 0);
    const expected = papers * 9 + 20;
    const d = demoState(s, start, now, expected);
    return {
      venue_id: venueByCode.get(s.code)!,
      meeting_title: `${TRACK_NAMES[s.track]}: ${s.subtrack}`,
      meeting_provider: "mock",
      external_meeting_id: `mock-${s.code}`,
      join_url: `https://meetings.demo.invalid/${s.code.toLowerCase()}`,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      meeting_status: s.status,
      expected_participants: expected,
      current_participants: d.count,
      coordinator_present: d.coord,
      actual_start_time: d.actualStart ? new Date(d.actualStart).toISOString() : null,
      last_activity_at: s.status === "scheduled" ? null : new Date(now - Math.floor(Math.random() * 4) * MIN).toISOString(),
      health_status: d.health,
      schedule: s.blocks,
      data_source: "simulated",
    };
  });
  const meetings = await supabase.from("meetings").insert(meetingRows).select("id, meeting_status, actual_start_time");
  if (meetings.error) throw new Error(`Seed failed: ${meetings.error.message}`);

  // Opening timeline events so the activity feed is not empty before the simulator runs.
  const events = meetings.data.flatMap((m) => {
    const out: Record<string, unknown>[] = [];
    if (m.actual_start_time) {
      out.push({ meeting_id: m.id, event_type: "meeting_started", event_description: "Meeting started", event_timestamp: m.actual_start_time, data_source: "simulated" });
      out.push({ meeting_id: m.id, event_type: "coordinator_joined", event_description: "Coordinator joined", event_timestamp: m.actual_start_time, data_source: "simulated" });
    }
    if (m.meeting_status === "technical_issue") {
      out.push({ meeting_id: m.id, event_type: "technical_issue", event_description: "Connection quality dropped", event_timestamp: new Date(now - 5 * MIN).toISOString(), data_source: "simulated" });
    }
    return out;
  });
  if (events.length) {
    const ev = await supabase.from("meeting_events").insert(events);
    if (ev.error) throw new Error(`Seed failed: ${ev.error.message}`);
  }

  return { venues: SESSIONS.length, coordinators: names.length };
}
