import { z } from "zod";
import { CATEGORIES, MEETING_STATUSES } from "@/lib/labels";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optionalText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

export const venueSchema = z.object({
  venue_code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,10}$/, "Venue ID must be 2–10 letters, digits or dashes."),
  venue_name: z.string().trim().min(2, "Venue name is required.").max(160),
  category: z.enum(CATEGORIES as [string, ...string[]], { message: "Choose a category." }),
  location: z.string().trim().min(2, "Location is required.").max(160),
  coordinator_id: z.preprocess(emptyToNull, z.uuid().nullable()),
});

export const coordinatorSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required.").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
  phone: optionalText(30),
  account_status: z.enum(["active", "inactive", "invited"]),
});

// datetime-local values carry no zone. The conference runs in India, so interpret them as IST.
const istDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a valid date and time.")
  .transform((v) => new Date(`${v}:00+05:30`).toISOString());

export const meetingSchema = z
  .object({
    venue_id: z.uuid("Choose a venue."),
    meeting_title: z.string().trim().min(3, "Title is required.").max(200),
    join_url: z.preprocess(
      emptyToNull,
      z.url({ protocol: /^https$/, message: "Meeting URL must start with https://" }).max(2000).nullable(),
    ),
    start_time: istDateTime,
    end_time: istDateTime,
    expected_participants: z.coerce.number().int().min(0).max(100000),
    meeting_status: z.enum(MEETING_STATUSES as [string, ...string[]]),
  })
  .refine((v) => new Date(v.end_time) > new Date(v.start_time), {
    message: "End time must be after the start time.",
    path: ["end_time"],
  });

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Invalid input.";
}

/** Postgres error code -> user-safe message (never leak raw DB errors). */
export function dbMessage(error: { code?: string }, fallback: string): string {
  if (error.code === "23505") return "That value is already in use (duplicate Venue ID, email or coordinator assignment).";
  if (error.code === "23503") return "A referenced record no longer exists.";
  if (error.code === "42501") return "You do not have permission to do that.";
  return fallback;
}
