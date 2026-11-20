import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { missingMicrosoftVars, ProviderNotConfiguredError } from "./config";
import { GraphError, NotSupportedByGraphError } from "./errors";
import { MicrosoftTeamsProvider } from "./teams-provider";

/**
 * Connects meetings created by hand in Outlook/Teams to the dashboard.
 *  1. linkTeamsMeetings: find each Teams join link in Microsoft and remember the meeting id.
 *  2. syncAttendance:    after a meeting ends, read its attendance report and split it into sessions.
 * Everything works with the caller's database client (RLS applies); no service role is needed for the
 * manual buttons. NOTE: written against the Graph v1.0 reference but not yet run against the real tenant.
 */

const MIN = 60_000;
const SESSION_PADDING = 15 * MIN; // people join slightly early / leave slightly late
const TEAMS_URL = /^https:\/\/teams\.microsoft\.com\/(l\/meetup-join|meet)\//i;

export interface SyncResult {
  ok: boolean;
  lines: string[];
}

/** Turns a Graph/config error into something an administrator can act on. */
export function explainError(e: unknown): string {
  if (e instanceof ProviderNotConfiguredError) return `Not configured yet. Missing settings: ${e.missing.join(", ")}.`;
  if (e instanceof GraphError) {
    if (e.status === 403) {
      return "Microsoft refused access (403). Usually the application access policy has not been granted to the organizer yet (it can take up to 30 minutes), or admin consent is missing for OnlineMeetings.Read.All / OnlineMeetingArtifact.Read.All.";
    }
    if (e.status === 401 || e.code?.startsWith("invalid_client") || e.code === "unauthorized_client") {
      return `Microsoft rejected the app credentials (${e.code ?? e.status}). Check the tenant ID, client ID and client secret (and that the secret has not expired).`;
    }
    if (e.status === 404) return "Microsoft could not find that meeting for the configured organizer account.";
    return `Microsoft returned an error (${e.status}${e.code ? `, ${e.code}` : ""}).`;
  }
  if (e instanceof NotSupportedByGraphError) return e.message;
  return "Unexpected error. Check the server logs.";
}

function teamsProvider() {
  return new MicrosoftTeamsProvider();
}

/** Quick health check: credentials, then one real lookup if a Teams link exists. */
export async function checkConnection(db: SupabaseClient): Promise<SyncResult> {
  const missing = missingMicrosoftVars();
  if (missing.length) return { ok: false, lines: [`Missing server settings: ${missing.join(", ")}.`] };
  try {
    const provider = teamsProvider();
    const { data } = await db.from("meetings").select("join_url").not("join_url", "is", null).limit(200);
    const url = (data ?? []).map((m) => m.join_url as string).find((u) => TEAMS_URL.test(u));
    if (!url) {
      return { ok: true, lines: ["Settings are complete. Add a real Teams join link to a session, then run this check again to test the connection to Microsoft."] };
    }
    const id = await provider.findMeetingIdByJoinUrl(url);
    return id
      ? { ok: true, lines: ["Connected. Microsoft found the test meeting, so credentials, permissions and the access policy are working."] }
      : { ok: false, lines: ["Credentials work, but Microsoft did not return a meeting for that link. Check that the link belongs to the configured organizer account."] };
  } catch (e) {
    return { ok: false, lines: [explainError(e)] };
  }
}

/** Looks up every session that has a Teams link but no Microsoft meeting id yet. Rooms share one link. */
export async function linkTeamsMeetings(db: SupabaseClient): Promise<SyncResult> {
  const { data, error } = await db.from("meetings").select("id, join_url, external_meeting_id, meeting_provider");
  if (error) return { ok: false, lines: ["Could not read meetings."] };

  const todo = (data ?? []).filter((m) => m.join_url && TEAMS_URL.test(m.join_url) && m.meeting_provider !== "microsoft_teams");
  if (todo.length === 0) return { ok: true, lines: ["No sessions with an unlinked Teams link were found."] };

  const byUrl = new Map<string, string[]>();
  for (const m of todo) byUrl.set(m.join_url, [...(byUrl.get(m.join_url) ?? []), m.id]);

  let provider: MicrosoftTeamsProvider;
  try { provider = teamsProvider(); } catch (e) { return { ok: false, lines: [explainError(e)] }; }

  const lines: string[] = [];
  let linkedSessions = 0;
  let unmatched = 0;
  for (const [url, ids] of byUrl) {
    try {
      const externalId = await provider.findMeetingIdByJoinUrl(url);
      if (!externalId) { unmatched++; continue; }
      // Switching to real data: drop simulated activity so the two never mix.
      for (const table of ["meeting_participants", "meeting_events", "meeting_technical_metrics"]) {
        await db.from(table).delete().in("meeting_id", ids).eq("data_source", "simulated");
      }
      await db.from("notifications").delete().in("meeting_id", ids).eq("data_source", "simulated");
      const { error: upErr } = await db.from("meetings").update({
        external_meeting_id: externalId, meeting_provider: "microsoft_teams", data_source: "provider",
        meeting_status: "scheduled", current_participants: 0, coordinator_present: false,
        actual_start_time: null, actual_end_time: null, last_activity_at: null, health_status: "unknown",
      }).in("id", ids);
      if (upErr) { lines.push("A meeting was found but could not be saved."); continue; }
      linkedSessions += ids.length;
    } catch (e) {
      lines.push(explainError(e));
      return { ok: false, lines }; // same cause for every link (policy/credentials): stop early
    }
  }
  lines.unshift(`Linked ${linkedSessions} session(s) across ${byUrl.size - unmatched} Teams link(s).`);
  if (unmatched) lines.push(`${unmatched} link(s) were not found in Microsoft (wrong organizer, or the link is not a scheduled meeting).`);
  return { ok: unmatched === 0, lines };
}

interface MeetingRow {
  id: string;
  external_meeting_id: string;
  start_time: string;
  end_time: string;
}

/** Reads attendance for every linked meeting that has ended and splits it into the sessions sharing that link. */
export async function syncAttendance(db: SupabaseClient): Promise<SyncResult> {
  const { data, error } = await db
    .from("meetings")
    .select("id, external_meeting_id, start_time, end_time")
    .eq("meeting_provider", "microsoft_teams")
    .not("external_meeting_id", "is", null);
  if (error) return { ok: false, lines: ["Could not read meetings."] };

  const rows = (data ?? []) as MeetingRow[];
  if (rows.length === 0) return { ok: true, lines: ["No sessions are linked to Teams yet. Run “Link Teams meetings” first."] };

  const byExternal = new Map<string, MeetingRow[]>();
  for (const r of rows) byExternal.set(r.external_meeting_id, [...(byExternal.get(r.external_meeting_id) ?? []), r]);

  let provider: MicrosoftTeamsProvider;
  try { provider = teamsProvider(); } catch (e) { return { ok: false, lines: [explainError(e)] }; }

  const now = Date.now();
  let synced = 0;
  let waiting = 0;
  const lines: string[] = [];

  for (const [externalId, sessions] of byExternal) {
    let records;
    try {
      records = await provider.getMeetingAttendance(externalId);
    } catch (e) {
      if (e instanceof NotSupportedByGraphError) { waiting++; continue; } // no report yet
      lines.push(explainError(e));
      return { ok: false, lines };
    }

    for (const s of sessions) {
      const winStart = new Date(s.start_time).getTime() - SESSION_PADDING;
      const winEnd = new Date(s.end_time).getTime() + SESSION_PADDING;
      const out: Record<string, unknown>[] = [];
      let first = Infinity;
      let last = -Infinity;

      for (const r of records) {
        const j = new Date(r.joinedAt).getTime();
        const l = r.leftAt ? new Date(r.leftAt).getTime() : winEnd;
        const from = Math.max(j, winStart);
        const to = Math.min(l, winEnd);
        if (to <= from) continue; // outside this session's window
        first = Math.min(first, from);
        last = Math.max(last, to);
        out.push({
          meeting_id: s.id, participant_name: r.name, participant_email: r.email, is_coordinator: r.isCoordinator,
          joined_at: new Date(from).toISOString(), left_at: new Date(to).toISOString(), data_source: "provider",
        });
      }

      await db.from("meeting_participants").delete().eq("meeting_id", s.id).eq("data_source", "provider");
      for (let i = 0; i < out.length; i += 200) {
        const { error: insErr } = await db.from("meeting_participants").insert(out.slice(i, i + 200));
        if (insErr) { lines.push("Attendance was read but could not be saved."); return { ok: false, lines }; }
      }

      const ended = now >= new Date(s.end_time).getTime();
      await db.from("meetings").update({
        current_participants: 0,
        coordinator_present: false,
        actual_start_time: out.length ? new Date(first).toISOString() : null,
        actual_end_time: out.length ? new Date(last).toISOString() : null,
        meeting_status: ended && out.length ? "ended" : "scheduled",
        last_activity_at: out.length ? new Date(last).toISOString() : null,
      }).eq("id", s.id);
      synced++;
    }
  }

  lines.unshift(`Updated attendance for ${synced} session(s).`);
  if (waiting) lines.push(`${waiting} meeting link(s) have no attendance report yet (reports appear after the meeting ends).`);
  return { ok: true, lines };
}
