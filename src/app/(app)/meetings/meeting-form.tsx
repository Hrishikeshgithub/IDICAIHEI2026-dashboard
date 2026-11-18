"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormError, SelectField, TextField } from "@/components/forms/fields";
import { MEETING_STATUSES, STATUS_LABELS } from "@/lib/labels";
import type { Meeting } from "@/lib/types";
import type { FormState } from "./actions";

type Action = (prev: FormState | undefined, fd: FormData) => Promise<FormState>;

/** ISO -> "YYYY-MM-DDTHH:mm" in IST, for <input type="datetime-local">. */
function toIstInput(iso?: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso)).replace(" ", "T");
}

export function MeetingForm({
  action, meeting, venues, lockVenue,
}: { action: Action; meeting?: Meeting; venues: { id: string; label: string }[]; lockVenue?: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="grid max-w-xl gap-4 rounded-2xl border border-slate-200/70 bg-white shadow-card p-5">
      {lockVenue && meeting ? <input type="hidden" name="venue_id" value={meeting.venue_id} /> : null}
      <SelectField label="Venue" name="venue_id" defaultValue={meeting?.venue_id} required>
        <option value="" disabled>Select venue</option>
        {venues.map((v) => <option key={v.id} value={v.id} disabled={lockVenue}>{v.label}</option>)}
      </SelectField>
      <TextField label="Meeting title" name="meeting_title" defaultValue={meeting?.meeting_title} required />
      <TextField label="Meeting URL (https)" name="join_url" type="url" defaultValue={meeting?.join_url ?? ""} placeholder="https://" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Start (IST)" name="start_time" type="datetime-local" defaultValue={toIstInput(meeting?.start_time)} required />
        <TextField label="End (IST)" name="end_time" type="datetime-local" defaultValue={toIstInput(meeting?.end_time)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Expected participants" name="expected_participants" type="number" min={0} defaultValue={meeting?.expected_participants ?? 0} required />
        <SelectField label="Status" name="meeting_status" defaultValue={meeting?.meeting_status ?? "scheduled"}>
          {MEETING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </SelectField>
      </div>
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : meeting ? "Save changes" : "Create meeting"}</Button>
        <Link href="/meetings" className={buttonVariants({ variant: "ghost" })}>Cancel</Link>
      </div>
    </form>
  );
}
