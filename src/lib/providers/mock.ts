import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeetingStatus } from "@/lib/types";
import type {
  CreateMeetingInput, MeetingProvider, ProviderAttendanceRecord, ProviderMeeting,
  ProviderParticipant,
} from "./types";

interface ParticipantRow {
  participant_name: string;
  participant_email: string | null;
  is_coordinator: boolean;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
}

/**
 * Demo provider. It "hosts" meetings in our own database and reads back what the
 * SimulationService generated. Join URLs use a reserved .invalid domain so they can
 * never be mistaken for real Teams links.
 */
export class MockMeetingProvider implements MeetingProvider {
  readonly name = "mock" as const;
  readonly simulated = true;

  constructor(private readonly db: SupabaseClient) {}

  async createMeeting(input: CreateMeetingInput): Promise<ProviderMeeting> {
    const slug = (input.reference ?? crypto.randomUUID().slice(0, 8)).toLowerCase().replace(/[^a-z0-9-]/g, "");
    return {
      externalMeetingId: `mock-${slug}-${Date.now().toString(36)}`,
      joinUrl: `https://meetings.demo.invalid/${slug}`,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
    };
  }

  // The mock has no remote system to update: the database row is the source of truth.
  async updateMeeting(): Promise<void> {}
  async deleteMeeting(): Promise<void> {}

  async getMeetingDetails(externalMeetingId: string): Promise<ProviderMeeting | null> {
    const { data } = await this.db
      .from("meetings")
      .select("external_meeting_id, join_url, meeting_title, start_time, end_time")
      .eq("external_meeting_id", externalMeetingId)
      .maybeSingle();
    if (!data) return null;
    return {
      externalMeetingId: data.external_meeting_id,
      joinUrl: data.join_url ?? "",
      title: data.meeting_title,
      startTime: data.start_time,
      endTime: data.end_time,
    };
  }

  async getMeetingStatus(externalMeetingId: string): Promise<MeetingStatus | null> {
    const { data } = await this.db
      .from("meetings").select("meeting_status").eq("external_meeting_id", externalMeetingId).maybeSingle();
    return (data?.meeting_status as MeetingStatus) ?? null;
  }

  private async rows(externalMeetingId: string): Promise<ParticipantRow[]> {
    const { data: meeting } = await this.db
      .from("meetings").select("id").eq("external_meeting_id", externalMeetingId).maybeSingle();
    if (!meeting) return [];
    const { data } = await this.db
      .from("meeting_participants")
      .select("participant_name, participant_email, is_coordinator, joined_at, left_at, duration_seconds")
      .eq("meeting_id", meeting.id)
      .order("joined_at");
    return (data ?? []) as ParticipantRow[];
  }

  async getMeetingParticipants(externalMeetingId: string): Promise<ProviderParticipant[]> {
    return (await this.rows(externalMeetingId)).map((r) => ({
      name: r.participant_name, email: r.participant_email, isCoordinator: r.is_coordinator,
      joinedAt: r.joined_at, leftAt: r.left_at,
    }));
  }

  async getMeetingAttendance(externalMeetingId: string): Promise<ProviderAttendanceRecord[]> {
    return (await this.rows(externalMeetingId)).map((r) => ({
      name: r.participant_name, email: r.participant_email, isCoordinator: r.is_coordinator,
      joinedAt: r.joined_at, leftAt: r.left_at, durationSeconds: r.duration_seconds,
    }));
  }
}
