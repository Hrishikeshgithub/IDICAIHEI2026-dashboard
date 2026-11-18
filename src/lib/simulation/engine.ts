import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthStatus, MeetingStatus } from "@/lib/types";
import { fakePerson } from "./names";

/**
 * SimulationService: advances every simulated meeting by one step and records what happened
 * (events, participants, metrics, alerts). All rows are tagged data_source = 'simulated'.
 * It is stateless — each tick reads the database, so it works from any server instance.
 */

const MIN = 60_000;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const chance = (p: number) => Math.random() < p;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

interface MeetingRow {
  id: string;
  meeting_status: MeetingStatus;
  start_time: string;
  end_time: string;
  expected_participants: number;
  current_participants: number;
  coordinator_present: boolean;
  actual_start_time: string | null;
  health_status: HealthStatus;
  venue_id: string;
  venues: { venue_code: string; venue_name: string; coordinators: { full_name: string; email: string } | null } | null;
}

type Insert = Record<string, unknown>;

export interface TickSummary {
  processed: number;
  events: number;
  alerts: number;
  changes: string[];
  at: string;
}

class MeetingStep {
  events: Insert[] = [];
  alerts: Insert[] = [];
  metrics: Insert[] = [];
  newParticipants: Insert[] = [];
  closeParticipants: { id?: string; count?: number; all?: boolean; coordinatorOnly?: boolean } | null = null;
  patch: Record<string, unknown> = {};
  changes: string[] = [];
  leavers = 0;

  constructor(readonly m: MeetingRow, readonly now: Date) {}

  get label() { return this.m.venues ? `${this.m.venues.venue_code} ${this.m.venues.venue_name}` : "Venue"; }

  event(type: string, description: string, metadata: Record<string, unknown> = {}) {
    this.events.push({ meeting_id: this.m.id, event_type: type, event_description: description, event_timestamp: this.now.toISOString(), metadata, data_source: "simulated" });
  }
  alert(type: string, severity: "info" | "warning" | "critical", message: string) {
    this.alerts.push({ venue_id: this.m.venue_id, meeting_id: this.m.id, notification_type: type, message: `${this.label}: ${message}`, severity, data_source: "simulated" });
  }
  setStatus(status: MeetingStatus, description: string) {
    this.patch.meeting_status = status;
    this.event("status_changed", description, { from: this.m.meeting_status, to: status });
    this.changes.push(`${this.label}: ${this.m.meeting_status} → ${status}`);
  }
  joinCoordinator() {
    const c = this.m.venues?.coordinators;
    this.patch.coordinator_present = true;
    this.event("coordinator_joined", `${c?.full_name ?? "Coordinator"} joined`);
    this.newParticipants.push({
      meeting_id: this.m.id, participant_name: c?.full_name ?? "Coordinator", participant_email: c?.email ?? null,
      is_coordinator: true, joined_at: this.now.toISOString(), data_source: "simulated",
    });
  }
  startSession() {
    this.patch.actual_start_time = this.now.toISOString();
    this.patch.health_status = "good";
    this.setStatus("live", "Session is live");
    this.event("meeting_started", "Meeting started");
    this.joinCoordinator();
  }
  recordMetrics(health: HealthStatus) {
    const band = {
      good: { q: [82, 100], lat: [20, 80], loss: [0, 0.6], av: [80, 100] },
      degraded: { q: [55, 78], lat: [100, 220], loss: [1, 4], av: [55, 78] },
      poor: { q: [12, 45], lat: [250, 600], loss: [5, 15], av: [15, 45] },
      unknown: { q: [70, 90], lat: [40, 120], loss: [0, 1], av: [70, 90] },
    }[health];
    const at = this.now.toISOString();
    const add = (metric_type: string, v: number[], digits = 0) =>
      this.metrics.push({ meeting_id: this.m.id, metric_type, metric_value: Number(rand(v[0], v[1]).toFixed(digits)), recorded_at: at, data_source: "simulated" });
    add("connection_quality", band.q);
    add("latency_ms", band.lat);
    add("packet_loss_pct", band.loss, 1);
    add("audio_quality", band.av);
    add("video_quality", band.av);
  }
}

function endSession(s: MeetingStep, unexpected: boolean) {
  s.patch.actual_end_time = s.now.toISOString();
  s.patch.current_participants = 0;
  s.patch.coordinator_present = false;
  s.closeParticipants = { all: true };
  s.setStatus("ended", unexpected ? "Meeting ended unexpectedly" : "Meeting ended");
  s.event("meeting_ended", unexpected ? "Meeting ended unexpectedly" : "Meeting ended");
  if (unexpected) s.alert("ended_unexpectedly", "critical", "meeting ended unexpectedly before its scheduled end");
}

function stepMeeting(m: MeetingRow, now: Date): MeetingStep {
  const s = new MeetingStep(m, now);
  const status = m.meeting_status;
  const sinceStart = now.getTime() - new Date(m.start_time).getTime();

  // A session that never got going must not sit in Starting/Waiting after its scheduled end.
  if ((status === "starting" || status === "waiting") && now >= new Date(m.end_time)) {
    s.patch.current_participants = 0;
    s.closeParticipants = { all: true };
    s.setStatus("ended", "Meeting ended without ever starting");
    s.alert("not_started_on_time", "critical", "meeting never started and its scheduled time has passed");
    return s;
  }

  if (status === "scheduled") {
    // Starts near its scheduled time. A small random chance accelerates it so a demo shows the full lifecycle.
    const startsSoon = new Date(m.start_time).getTime() - now.getTime() <= 5 * MIN;
    if (startsSoon || chance(0.04)) s.setStatus("starting", "Session is starting");
  } else if (status === "starting") {
    if (chance(0.5)) {
      if (chance(0.85)) s.startSession();
      else {
        s.setStatus("waiting", "Waiting for the coordinator");
        s.alert("coordinator_absent", "warning", "coordinator has not joined");
      }
    }
  } else if (status === "waiting") {
    if (chance(0.25)) s.startSession();
    else if (sinceStart > 10 * MIN) s.alert("not_started_on_time", "warning", `meeting has not started ${Math.floor(sinceStart / MIN)} min after schedule`);
  } else if (status === "live" || status === "technical_issue") {
    const issue = status === "technical_issue";

    if (now >= new Date(m.end_time)) {
      endSession(s, false);
      return s;
    }
    if (issue && chance(0.01)) {
      endSession(s, true);
      return s;
    }

    // Coordinator presence
    if (m.coordinator_present && chance(0.02)) {
      s.patch.coordinator_present = false;
      s.closeParticipants = { coordinatorOnly: true };
      s.event("coordinator_left", "Coordinator disconnected");
      s.alert("coordinator_absent", "warning", "coordinator disconnected");
    } else if (!m.coordinator_present && chance(0.3)) {
      s.joinCoordinator();
    }

    // Participants
    const cap = Math.round(m.expected_participants * 1.1);
    let delta: number;
    if (issue) delta = -Math.round(rand(0, 3));
    else if (m.current_participants > 12 && chance(0.015)) {
      delta = -Math.round(m.current_participants * rand(0.3, 0.45));
      s.alert("participant_drop", "warning", `participant count dropped sharply (${m.current_participants} → ${m.current_participants + delta})`);
    } else {
      const target = m.expected_participants * 0.8;
      delta = Math.round((target - m.current_participants) * 0.12 + rand(-3, 4));
    }
    const next = clamp(m.current_participants + delta, 0, cap);
    delta = next - m.current_participants;

    if (delta > 0) {
      for (let i = 0; i < delta; i++) {
        const p = fakePerson();
        s.newParticipants.push({ meeting_id: m.id, participant_name: p.name, participant_email: p.email, is_coordinator: false, joined_at: now.toISOString(), data_source: "simulated" });
        if (i < 3) s.event("participant_joined", `${p.name} joined`, { count: next });
      }
    } else if (delta < 0) {
      s.leavers = -delta;
      s.closeParticipants = { ...(s.closeParticipants ?? {}), count: -delta };
    }
    s.patch.current_participants = next;

    // Technical health
    if (!issue && chance(0.02)) {
      s.patch.health_status = "poor";
      s.setStatus("technical_issue", "Connection issue detected");
      s.event("technical_issue", "Connection quality dropped");
      s.alert("technical_issue", "critical", "technical connection issue detected");
    } else if (issue && chance(0.15)) {
      s.patch.health_status = "degraded";
      s.setStatus("live", "Connection recovered");
    } else if (!issue) {
      s.patch.health_status = chance(0.08) ? "degraded" : "good";
    }
    s.recordMetrics((s.patch.health_status as HealthStatus) ?? m.health_status);
    s.patch.last_activity_at = now.toISOString();
  }
  return s;
}

async function hasRecentUnreadAlert(db: SupabaseClient, meetingId: string, type: string, now: Date) {
  const since = new Date(now.getTime() - 15 * MIN).toISOString();
  const { count } = await db.from("notifications").select("id", { count: "exact", head: true })
    .eq("meeting_id", meetingId).eq("notification_type", type).eq("is_read", false).gte("created_at", since);
  return (count ?? 0) > 0;
}

async function persist(db: SupabaseClient, s: MeetingStep) {
  const now = s.now.toISOString();
  const ops: PromiseLike<unknown>[] = [];

  // Close participants first, then insert new ones (avoids closing a row we just created).
  const close = s.closeParticipants;
  if (close) {
    if (close.all) {
      await db.from("meeting_participants").update({ left_at: now }).eq("meeting_id", s.m.id).is("left_at", null);
    } else {
      if (close.coordinatorOnly) {
        await db.from("meeting_participants").update({ left_at: now }).eq("meeting_id", s.m.id).eq("is_coordinator", true).is("left_at", null);
      }
      if (close.count) {
        const { data: open } = await db.from("meeting_participants").select("id, participant_name")
          .eq("meeting_id", s.m.id).eq("is_coordinator", false).is("left_at", null).limit(close.count);
        if (open?.length) {
          await db.from("meeting_participants").update({ left_at: now }).in("id", open.map((r) => r.id));
          open.slice(0, 3).forEach((r) => s.event("participant_left", `${r.participant_name} left`));
        }
      }
    }
  }

  if (s.newParticipants.length) ops.push(db.from("meeting_participants").insert(s.newParticipants).then());
  if (s.events.length) ops.push(db.from("meeting_events").insert(s.events).then());
  if (s.metrics.length) ops.push(db.from("meeting_technical_metrics").insert(s.metrics).then());
  if (Object.keys(s.patch).length) ops.push(db.from("meetings").update(s.patch).eq("id", s.m.id).then());

  const alerts: Insert[] = [];
  for (const a of s.alerts) {
    if (!(await hasRecentUnreadAlert(db, s.m.id, a.notification_type as string, s.now))) alerts.push(a);
  }
  if (alerts.length) ops.push(db.from("notifications").insert(alerts).then());

  await Promise.all(ops);
  return alerts.length;
}

export async function runSimulationTick(db: SupabaseClient): Promise<TickSummary> {
  const now = new Date();
  const { data, error } = await db
    .from("meetings")
    .select("id, meeting_status, start_time, end_time, expected_participants, current_participants, coordinator_present, actual_start_time, health_status, venue_id, venues(venue_code, venue_name, coordinators(full_name, email))")
    .eq("data_source", "simulated");
  if (error) throw new Error("Could not load meetings.");

  const steps = (data as unknown as MeetingRow[]).filter((m) => m.meeting_status !== "ended").map((m) => stepMeeting(m, now));
  const alertCounts = await Promise.all(steps.map((s) => persist(db, s)));

  // Keep the metrics table small: only the last 20 minutes are useful for monitoring.
  await db.from("meeting_technical_metrics").delete().lt("recorded_at", new Date(now.getTime() - 20 * MIN).toISOString());

  return {
    processed: steps.length,
    events: steps.reduce((n, s) => n + s.events.length, 0),
    alerts: alertCounts.reduce((n, c) => n + c, 0),
    changes: steps.flatMap((s) => s.changes),
    at: now.toISOString(),
  };
}
