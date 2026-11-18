import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, HealthStatus, MeetingStatus } from "@/lib/types";

/**
 * Demo seed. Everything written here is tagged data_source = 'simulated' and the
 * join URLs point at a reserved .invalid domain, so nothing can pass for real Teams data.
 */

interface VenueSeed {
  name: string;
  category: Category;
  location: string;
  coordinator: string;
  status: MeetingStatus;
  title: string;
  expected: number;
}

const VENUES: VenueSeed[] = [
  // Medical & Healthcare (highest priority, most venues)
  { name: "Cardiology & Critical Care Hall", category: "medical_healthcare", location: "Wardha", coordinator: "Dr. Anita Deshmukh", status: "live", title: "AI in Cardiac Imaging & Critical Care", expected: 140 },
  { name: "Radiology Auditorium", category: "medical_healthcare", location: "Nagpur", coordinator: "Dr. Rahul Kulkarni", status: "live", title: "Deep Learning for Medical Imaging", expected: 120 },
  { name: "Oncology Seminar Room", category: "medical_healthcare", location: "Pune", coordinator: "Dr. Meera Joshi", status: "technical_issue", title: "Precision Oncology and Drug Discovery", expected: 90 },
  { name: "Telemedicine Studio", category: "medical_healthcare", location: "Mumbai", coordinator: "Dr. Sanjay Patil", status: "live", title: "Telehealth & Remote Patient Monitoring", expected: 110 },
  { name: "Mental Health Forum", category: "medical_healthcare", location: "Hyderabad", coordinator: "Dr. Kavita Rao", status: "starting", title: "AI for Mental Health Support", expected: 80 },
  { name: "Clinical Decision Support Lab", category: "medical_healthcare", location: "Bengaluru", coordinator: "Dr. Imran Shaikh", status: "waiting", title: "Clinical Decision Support Systems", expected: 100 },
  { name: "Surgical Robotics Theatre", category: "medical_healthcare", location: "Chennai", coordinator: "Dr. Priya Nair", status: "scheduled", title: "Robotic Surgery and AI Guidance", expected: 95 },
  { name: "Population Health Centre", category: "medical_healthcare", location: "Delhi", coordinator: "Dr. Vikram Singh", status: "ended", title: "Population Health Analytics", expected: 85 },
  { name: "Health Data Security Room", category: "medical_healthcare", location: "Kolkata", coordinator: "Dr. Soumya Banerjee", status: "live", title: "Securing Health Data with AI", expected: 70 },
  // Education
  { name: "Learning Analytics Hall", category: "education", location: "Wardha", coordinator: "Prof. Neha Gupta", status: "live", title: "Learning Analytics and Personalised Learning", expected: 100 },
  { name: "Intelligent Tutoring Lab", category: "education", location: "Jaipur", coordinator: "Prof. Arjun Mehta", status: "live", title: "Intelligent Tutoring Systems", expected: 75 },
  { name: "Accessibility & Inclusion Room", category: "education", location: "Lucknow", coordinator: "Prof. Farah Khan", status: "scheduled", title: "AI for Accessible Education", expected: 60 },
  { name: "Assessment Innovation Studio", category: "education", location: "Bhopal", coordinator: "Prof. Ramesh Iyer", status: "ended", title: "Automated Assessment and Feedback", expected: 65 },
  { name: "Educational Robotics Workshop", category: "education", location: "Indore", coordinator: "Prof. Sunita Verma", status: "waiting", title: "Educational Robotics with AI", expected: 55 },
  // Industry
  { name: "Predictive Maintenance Hall", category: "industry", location: "Ahmedabad", coordinator: "Mr. Deepak Sharma", status: "live", title: "Predictive Maintenance in Manufacturing", expected: 90 },
  { name: "Smart Grid & Energy Room", category: "industry", location: "Surat", coordinator: "Ms. Pooja Reddy", status: "scheduled", title: "AI for Smart Grids and Energy", expected: 70 },
  { name: "Supply Chain Analytics Lab", category: "industry", location: "Visakhapatnam", coordinator: "Mr. Anil Kumar", status: "ended", title: "Supply Chain Optimisation with AI", expected: 60 },
  { name: "Industrial Cybersecurity Suite", category: "industry", location: "Coimbatore", coordinator: "Ms. Lakshmi Menon", status: "starting", title: "Cybersecurity for Industrial Systems", expected: 65 },
];

const MIN = 60_000;

function plan(status: MeetingStatus, expected: number, now: number) {
  const iso = (offsetMin: number) => new Date(now + offsetMin * MIN).toISOString();
  const rand = (lo: number, hi: number) => Math.floor(lo + Math.random() * (hi - lo));
  switch (status) {
    case "live":
      return { start: iso(-40), end: iso(80), actualStart: iso(-38), count: rand(Math.round(expected * 0.6), Math.round(expected * 0.95)), coord: true, health: "good" as HealthStatus };
    case "technical_issue":
      return { start: iso(-30), end: iso(90), actualStart: iso(-28), count: rand(10, 30), coord: true, health: "poor" as HealthStatus };
    case "starting":
      return { start: iso(-2), end: iso(118), actualStart: null, count: rand(3, 15), coord: true, health: "unknown" as HealthStatus };
    case "waiting":
      return { start: iso(-12), end: iso(108), actualStart: null, count: rand(0, 8), coord: false, health: "unknown" as HealthStatus };
    case "scheduled":
      return { start: iso(120), end: iso(240), actualStart: null, count: 0, coord: false, health: "unknown" as HealthStatus };
    case "ended":
      return { start: iso(-190), end: iso(-70), actualStart: iso(-188), count: 0, coord: false, health: "good" as HealthStatus };
  }
}

export async function resetDemoData(supabase: SupabaseClient) {
  // Cascades remove venues, meetings, participants, events, metrics and notifications.
  const a = await supabase.from("conferences").delete().not("id", "is", null);
  if (a.error) throw new Error(`Reset failed: ${a.error.message}`);
  const b = await supabase.from("coordinators").delete().eq("data_source", "simulated");
  if (b.error) throw new Error(`Reset failed: ${b.error.message}`);
}

export async function seedDemoData(supabase: SupabaseClient): Promise<{ venues: number }> {
  const { count } = await supabase.from("venues").select("id", { count: "exact", head: true });
  if (count && count > 0) throw new Error("Demo data already exists. Reset it first to reseed.");

  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  const conf = await supabase
    .from("conferences")
    .insert({ name: "IDICAIHEI-2026 (Demo)", conference_date: today, start_date: today, end_date: today, status: "active", demo_mode: true })
    .select("id")
    .single();
  if (conf.error) throw new Error(`Seed failed: ${conf.error.message}`);

  const coords = await supabase
    .from("coordinators")
    .insert(
      VENUES.map((v, i) => ({
        full_name: v.coordinator,
        email: `coordinator${String(i + 1).padStart(2, "0")}@demo.example.org`,
        phone: `+91 90000 ${String(10000 + i)}`,
        account_status: "active",
        is_connected: false,
        data_source: "simulated",
      })),
    )
    .select("id, email");
  if (coords.error) throw new Error(`Seed failed: ${coords.error.message}`);
  const coordByEmail = new Map(coords.data.map((c) => [c.email, c.id]));

  const venues = await supabase
    .from("venues")
    .insert(
      VENUES.map((v, i) => ({
        conference_id: conf.data.id,
        venue_code: `V${String(i + 1).padStart(2, "0")}`,
        venue_name: v.name,
        category: v.category,
        location: v.location,
        coordinator_id: coordByEmail.get(`coordinator${String(i + 1).padStart(2, "0")}@demo.example.org`),
      })),
    )
    .select("id, venue_code");
  if (venues.error) throw new Error(`Seed failed: ${venues.error.message}`);
  const venueByCode = new Map(venues.data.map((v) => [v.venue_code, v.id]));

  const meetingRows = VENUES.map((v, i) => {
    const code = `V${String(i + 1).padStart(2, "0")}`;
    const p = plan(v.status, v.expected, now);
    return {
      venue_id: venueByCode.get(code)!,
      meeting_title: v.title,
      meeting_provider: "mock",
      external_meeting_id: `mock-${code}`,
      join_url: `https://meetings.demo.invalid/${code.toLowerCase()}`,
      start_time: p.start,
      end_time: p.end,
      meeting_status: v.status,
      expected_participants: v.expected,
      current_participants: p.count,
      coordinator_present: p.coord,
      actual_start_time: p.actualStart,
      actual_end_time: v.status === "ended" ? new Date(now - 70 * MIN).toISOString() : null,
      last_activity_at: v.status === "scheduled" ? null : new Date(now - Math.floor(Math.random() * 4) * MIN).toISOString(),
      health_status: p.health,
      data_source: "simulated",
    };
  });
  const meetings = await supabase.from("meetings").insert(meetingRows).select("id, meeting_status, actual_start_time, venue_id");
  if (meetings.error) throw new Error(`Seed failed: ${meetings.error.message}`);

  // Opening timeline events so the activity feed is not empty before the simulator runs.
  const events = meetings.data.flatMap((m) => {
    const out: Record<string, unknown>[] = [];
    if (m.actual_start_time) {
      out.push({ meeting_id: m.id, event_type: "meeting_started", event_description: "Meeting started", event_timestamp: m.actual_start_time, data_source: "simulated" });
      out.push({ meeting_id: m.id, event_type: "coordinator_joined", event_description: "Coordinator joined", event_timestamp: m.actual_start_time, data_source: "simulated" });
    }
    if (m.meeting_status === "ended") {
      out.push({ meeting_id: m.id, event_type: "meeting_ended", event_description: "Meeting ended", event_timestamp: new Date(now - 70 * MIN).toISOString(), data_source: "simulated" });
    }
    if (m.meeting_status === "technical_issue") {
      out.push({ meeting_id: m.id, event_type: "technical_issue", event_description: "Connection quality dropped", event_timestamp: new Date(now - 5 * MIN).toISOString(), data_source: "simulated" });
    }
    return out;
  });
  const ev = await supabase.from("meeting_events").insert(events);
  if (ev.error) throw new Error(`Seed failed: ${ev.error.message}`);

  return { venues: VENUES.length };
}
