import type { MeetingStatus } from "@/lib/types";

/**
 * Provider-neutral meeting contract. The dashboard only talks to this interface,
 * so a MicrosoftTeamsProvider (Graph API) can replace MockMeetingProvider later
 * without changing pages, components or the database.
 */

export type ProviderName = "mock" | "microsoft_teams";

export interface CreateMeetingInput {
  title: string;
  startTime: string; // ISO
  endTime: string; // ISO
  /** Reference used by the provider, e.g. venue code. */
  reference?: string;
}

export interface ProviderMeeting {
  externalMeetingId: string;
  joinUrl: string;
  title: string;
  startTime: string;
  endTime: string;
}

export interface UpdateMeetingInput {
  title?: string;
  startTime?: string;
  endTime?: string;
}

export interface ProviderParticipant {
  name: string;
  email: string | null;
  isCoordinator: boolean;
  joinedAt: string;
  leftAt: string | null;
}

export interface ProviderAttendanceRecord extends ProviderParticipant {
  durationSeconds: number | null;
}

export interface MeetingProvider {
  readonly name: ProviderName;
  /** True when the data this provider returns is simulated, not real provider data. */
  readonly simulated: boolean;

  createMeeting(input: CreateMeetingInput): Promise<ProviderMeeting>;
  updateMeeting(externalMeetingId: string, input: UpdateMeetingInput): Promise<void>;
  deleteMeeting(externalMeetingId: string): Promise<void>;
  getMeetingDetails(externalMeetingId: string): Promise<ProviderMeeting | null>;
  getMeetingParticipants(externalMeetingId: string): Promise<ProviderParticipant[]>;
  getMeetingAttendance(externalMeetingId: string): Promise<ProviderAttendanceRecord[]>;
  getMeetingStatus(externalMeetingId: string): Promise<MeetingStatus | null>;
}
