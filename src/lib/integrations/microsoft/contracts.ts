import { z } from "zod";

/**
 * API contracts for the Microsoft Graph resources this app will use. They are validated with zod
 * at the boundary so an unexpected payload fails loudly instead of corrupting dashboard data.
 * Shapes follow the Microsoft Graph v1.0 reference (checked November 2026).
 */

// POST /users/{userId}/onlineMeetings  (app permission OnlineMeetings.ReadWrite.All + application access policy)
export const onlineMeetingSchema = z.object({
  id: z.string(),
  joinWebUrl: z.string().nullish(),
  subject: z.string().nullish(),
  startDateTime: z.string().nullish(),
  endDateTime: z.string().nullish(),
});
export type OnlineMeeting = z.infer<typeof onlineMeetingSchema>;

export const createOnlineMeetingBody = (input: { subject: string; startDateTime: string; endDateTime: string }) => ({
  subject: input.subject,
  startDateTime: input.startDateTime,
  endDateTime: input.endDateTime,
});

// GET /users/{userId}/onlineMeetings/{meetingId}/attendanceReports  (OnlineMeetingArtifact.Read.All)
// A report is generated only after the meeting ends. Channel meetings are not supported.
export const attendanceIntervalSchema = z.object({
  joinDateTime: z.string(),
  leaveDateTime: z.string().nullish(),
  durationInSeconds: z.number().nullish(),
});

export const attendanceRecordSchema = z.object({
  emailAddress: z.string().nullish(),
  totalAttendanceInSeconds: z.number().nullish(),
  role: z.string().nullish(), // e.g. Organizer, Presenter, Attendee
  identity: z.object({ id: z.string().nullish(), displayName: z.string().nullish() }).nullish(),
  attendanceIntervals: z.array(attendanceIntervalSchema).default([]),
});

export const attendanceReportSchema = z.object({
  id: z.string(),
  totalParticipantCount: z.number().nullish(),
  meetingStartDateTime: z.string().nullish(),
  meetingEndDateTime: z.string().nullish(),
  attendanceRecords: z.array(attendanceRecordSchema).default([]),
});
export type AttendanceReport = z.infer<typeof attendanceReportSchema>;

export const attendanceReportListSchema = z.object({ value: z.array(attendanceReportSchema.pick({ id: true, meetingStartDateTime: true, meetingEndDateTime: true })) });

// Change notifications (webhook body). Lifecycle notifications reuse the same envelope.
export const changeNotificationSchema = z.object({
  id: z.string().optional(), // present on change notifications, absent on lifecycle notifications
  subscriptionId: z.string(),
  subscriptionExpirationDateTime: z.string().optional(),
  tenantId: z.string().optional(),
  clientState: z.string().optional(),
  changeType: z.string().optional(),
  resource: z.string().optional(),
  lifecycleEvent: z.enum(["reauthorizationRequired", "subscriptionRemoved", "missed"]).optional(),
  resourceData: z.record(z.string(), z.unknown()).optional(),
});
export type ChangeNotification = z.infer<typeof changeNotificationSchema>;

export const changeNotificationCollectionSchema = z.object({ value: z.array(changeNotificationSchema).max(500) });

// POST /subscriptions and PATCH /subscriptions/{id}
export const subscriptionSchema = z.object({
  id: z.string(),
  resource: z.string(),
  changeType: z.string(),
  expirationDateTime: z.string(),
});
export type GraphSubscription = z.infer<typeof subscriptionSchema>;

export const createSubscriptionBody = (input: {
  resource: string; changeType: string; notificationUrl: string; lifecycleNotificationUrl: string;
  expirationDateTime: string; clientState: string;
}) => input;
