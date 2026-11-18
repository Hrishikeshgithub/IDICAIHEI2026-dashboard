import "server-only";
import type {
  CreateMeetingInput, MeetingProvider, ProviderAttendanceRecord, ProviderMeeting, ProviderParticipant, UpdateMeetingInput,
} from "@/lib/providers/types";
import type { MeetingStatus } from "@/lib/types";
import { getMicrosoftConfig } from "./config";
import {
  attendanceReportListSchema, attendanceReportSchema, createOnlineMeetingBody, onlineMeetingSchema, type OnlineMeeting,
} from "./contracts";
import { NotSupportedByGraphError } from "./errors";
import { graphFetch, type GraphLogger } from "./graph-client";

/**
 * Microsoft Teams provider (Microsoft Graph).
 *
 * STATUS: written against the Graph v1.0 reference but NOT yet exercised against a real tenant —
 * no Microsoft 365 tenant exists yet. Nothing here returns simulated values: where Graph cannot
 * supply data the method throws NotSupportedByGraphError or returns null, and the UI must say so.
 *
 * App-only calls act on behalf of a configured organizer (MS_ORGANIZER_USER_ID); the tenant admin
 * must grant that user an application access policy for this app (see docs/MICROSOFT_INTEGRATION.md).
 */
export class MicrosoftTeamsProvider implements MeetingProvider {
  readonly name = "microsoft_teams" as const;
  readonly simulated = false;
  private readonly organizer: string;

  constructor(private readonly log?: GraphLogger) {
    this.organizer = encodeURIComponent(getMicrosoftConfig().organizerUserId);
  }

  private meetingPath(id: string) {
    return `/users/${this.organizer}/onlineMeetings/${encodeURIComponent(id)}`;
  }

  private toProviderMeeting(m: OnlineMeeting): ProviderMeeting {
    return {
      externalMeetingId: m.id,
      joinUrl: m.joinWebUrl ?? "",
      title: m.subject ?? "",
      startTime: m.startDateTime ?? "",
      endTime: m.endDateTime ?? "",
    };
  }

  async createMeeting(input: CreateMeetingInput): Promise<ProviderMeeting> {
    const res = await graphFetch(
      `/users/${this.organizer}/onlineMeetings`,
      { method: "POST", body: createOnlineMeetingBody({ subject: input.title, startDateTime: input.startTime, endDateTime: input.endTime }) },
      this.log,
    );
    return this.toProviderMeeting(onlineMeetingSchema.parse(res));
  }

  async updateMeeting(externalMeetingId: string, input: UpdateMeetingInput): Promise<void> {
    await graphFetch(this.meetingPath(externalMeetingId), {
      method: "PATCH",
      body: { subject: input.title, startDateTime: input.startTime, endDateTime: input.endTime },
    }, this.log);
  }

  async deleteMeeting(externalMeetingId: string): Promise<void> {
    await graphFetch(this.meetingPath(externalMeetingId), { method: "DELETE" }, this.log);
  }

  async getMeetingDetails(externalMeetingId: string): Promise<ProviderMeeting | null> {
    const res = await graphFetch(this.meetingPath(externalMeetingId), {}, this.log);
    return res ? this.toProviderMeeting(onlineMeetingSchema.parse(res)) : null;
  }

  /** Graph exposes no "current status" for a meeting; status must be derived from notifications/reports. */
  async getMeetingStatus(): Promise<MeetingStatus | null> {
    return null;
  }

  /** Live participant presence is not available from the standard onlineMeeting APIs. */
  async getMeetingParticipants(): Promise<ProviderParticipant[]> {
    throw new NotSupportedByGraphError("Live participant presence");
  }

  /** Attendance exists only after the meeting has ended (Graph generates the report then). */
  async getMeetingAttendance(externalMeetingId: string): Promise<ProviderAttendanceRecord[]> {
    const list = attendanceReportListSchema.parse(await graphFetch(`${this.meetingPath(externalMeetingId)}/attendanceReports`, {}, this.log));
    if (list.value.length === 0) throw new NotSupportedByGraphError("An attendance report (the meeting may not have ended yet)");

    const records: ProviderAttendanceRecord[] = [];
    for (const summary of list.value) {
      const report = attendanceReportSchema.parse(
        await graphFetch(`${this.meetingPath(externalMeetingId)}/attendanceReports/${encodeURIComponent(summary.id)}?$expand=attendanceRecords`, {}, this.log),
      );
      for (const rec of report.attendanceRecords) {
        for (const interval of rec.attendanceIntervals) {
          records.push({
            name: rec.identity?.displayName ?? rec.emailAddress ?? "Unknown",
            email: rec.emailAddress ?? null,
            isCoordinator: rec.role === "Organizer" || rec.role === "Presenter",
            joinedAt: interval.joinDateTime,
            leftAt: interval.leaveDateTime ?? null,
            durationSeconds: interval.durationInSeconds ?? null,
          });
        }
      }
    }
    return records;
  }
}
