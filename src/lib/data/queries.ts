import { createClient } from "@/lib/supabase/server";
import type { Category, Conference, Coordinator, Meeting, MeetingStatus, Venue, VenueOverview } from "@/lib/types";

export async function getConference(): Promise<Conference | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("conferences").select("*").order("created_at").limit(1).maybeSingle();
  return data as Conference | null;
}

export interface VenueFilters {
  q?: string;
  category?: Category;
  status?: MeetingStatus;
}

type VenueRow = Venue & { coordinators: Coordinator | null; meetings: Meeting[] };

/** All venues visible to the caller (RLS limits coordinators to their own), with coordinator + meeting. */
export async function getVenueOverviews(filters: VenueFilters = {}): Promise<VenueOverview[]> {
  const supabase = await createClient();
  let query = supabase
    .from("venues")
    .select("*, coordinators(*), meetings(*)")
    .order("venue_code");
  if (filters.category) query = query.eq("category", filters.category);

  const { data, error } = await query;
  if (error) throw new Error("Failed to load venues");

  let rows = (data as unknown as VenueRow[]).map<VenueOverview>(({ coordinators, meetings, ...venue }) => ({
    ...venue,
    coordinator: coordinators,
    meeting: meetings[0] ?? null,
  }));

  if (filters.status) rows = rows.filter((v) => v.meeting?.meeting_status === filters.status);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter((v) =>
      [v.venue_name, v.venue_code, v.location, v.coordinator?.full_name, v.meeting?.meeting_title]
        .some((s) => s?.toLowerCase().includes(q)),
    );
  }
  return rows;
}

export async function getVenueOverview(id: string): Promise<VenueOverview | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("venues")
    .select("*, coordinators(*), meetings(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { coordinators, meetings, ...venue } = data as unknown as VenueRow;
  return { ...venue, coordinator: coordinators, meeting: meetings[0] ?? null };
}

export async function getCoordinators(): Promise<(Coordinator & { venue: Pick<Venue, "id" | "venue_name" | "venue_code"> | null })[]> {
  const supabase = await createClient();
  const [{ data: coords }, { data: venues }] = await Promise.all([
    supabase.from("coordinators").select("*").order("full_name"),
    supabase.from("venues").select("id, venue_name, venue_code, coordinator_id"),
  ]);
  return ((coords ?? []) as Coordinator[]).map((c) => ({
    ...c,
    venue: venues?.find((v) => v.coordinator_id === c.id) ?? null,
  }));
}

export async function getRecentEvents(limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meeting_events")
    .select("id, event_type, event_description, event_timestamp, data_source, meetings(venue_id, venues(venue_name, venue_code))")
    .order("event_timestamp", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export interface ParticipantRecord {
  id: string;
  participant_name: string;
  is_coordinator: boolean;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
}
export interface EventRecord { id: string; event_type: string; event_description: string; event_timestamp: string; data_source: string }
export interface MetricRecord { metric_type: string; metric_value: number; recorded_at: string }
export interface NotificationRecord {
  id: string; venue_id: string | null; meeting_id: string | null; notification_type: string;
  message: string; severity: "info" | "warning" | "critical"; is_read: boolean; data_source: string; created_at: string;
}

export async function getMeetingActivity(meetingId: string) {
  const supabase = await createClient();
  const [participants, events, metrics, alerts] = await Promise.all([
    supabase.from("meeting_participants")
      .select("id, participant_name, is_coordinator, joined_at, left_at, duration_seconds")
      .eq("meeting_id", meetingId).order("joined_at", { ascending: false }).limit(100),
    supabase.from("meeting_events")
      .select("id, event_type, event_description, event_timestamp, data_source")
      .eq("meeting_id", meetingId).order("event_timestamp", { ascending: false }).limit(40),
    supabase.from("meeting_technical_metrics")
      .select("metric_type, metric_value, recorded_at")
      .eq("meeting_id", meetingId).order("recorded_at", { ascending: false }).limit(40),
    supabase.from("notifications")
      .select("id, venue_id, meeting_id, notification_type, message, severity, is_read, data_source, created_at")
      .eq("meeting_id", meetingId).order("created_at", { ascending: false }).limit(10),
  ]);
  return {
    participants: (participants.data ?? []) as ParticipantRecord[],
    events: (events.data ?? []) as EventRecord[],
    metrics: (metrics.data ?? []) as MetricRecord[],
    alerts: (alerts.data ?? []) as NotificationRecord[],
  };
}

export async function getNotifications(opts: { unreadOnly?: boolean } = {}) {
  const supabase = await createClient();
  let q = supabase.from("notifications")
    .select("id, venue_id, meeting_id, notification_type, message, severity, is_read, data_source, created_at")
    .order("created_at", { ascending: false }).limit(200);
  if (opts.unreadOnly) q = q.eq("is_read", false);
  const { data } = await q;
  return (data ?? []) as NotificationRecord[];
}

export interface AuditEntry {
  id: string; user_id: string | null; action: string; entity_type: string; entity_id: string | null;
  details: Record<string, unknown>; created_at: string; actor: string | null;
}

const AUDIT_PAGE = 50;

export async function getAuditLogs(opts: { action?: string; entity?: string; page?: number } = {}) {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  let q = supabase.from("audit_logs")
    .select("id, user_id, action, entity_type, entity_id, details, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * AUDIT_PAGE, page * AUDIT_PAGE - 1);
  if (opts.action) q = q.eq("action", opts.action);
  if (opts.entity) q = q.eq("entity_type", opts.entity);
  const { data, count } = await q;

  const ids = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  const { data: profs } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const actors = new Map((profs ?? []).map((p) => [p.id, p.full_name ?? p.email ?? null]));

  return {
    entries: (data ?? []).map((r) => ({ ...r, actor: r.user_id ? actors.get(r.user_id) ?? null : null })) as AuditEntry[],
    total: count ?? 0,
    pageSize: AUDIT_PAGE,
    page,
  };
}

/** Distinct values used by the log filters. */
export async function getAuditFilterOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_logs").select("action, entity_type").limit(1000);
  return {
    actions: [...new Set((data ?? []).map((r) => r.action))].sort(),
    entities: [...new Set((data ?? []).map((r) => r.entity_type))].sort(),
  };
}

/** Meetings a coordinator attended, plus audit entries about their record. */
export async function getCoordinatorHistory(coordinatorId: string, email: string) {
  const supabase = await createClient();
  const [sessions, changes] = await Promise.all([
    supabase.from("meeting_participants")
      .select("id, joined_at, left_at, duration_seconds, meetings(meeting_title, venues(venue_code, venue_name))")
      .eq("is_coordinator", true).eq("participant_email", email)
      .order("joined_at", { ascending: false }).limit(30),
    supabase.from("audit_logs")
      .select("id, action, details, created_at")
      .eq("entity_type", "coordinator").eq("entity_id", coordinatorId)
      .order("created_at", { ascending: false }).limit(20),
  ]);
  return { sessions: sessions.data ?? [], changes: changes.data ?? [] };
}
