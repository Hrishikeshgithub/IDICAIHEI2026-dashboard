import { requireSuperAdmin } from "@/lib/auth";
import { getVenueOverviews } from "@/lib/data/queries";
import { MeetingForm } from "../meeting-form";
import { createMeetingAction } from "../actions";

export default async function NewMeetingPage() {
  await requireSuperAdmin();
  const venues = (await getVenueOverviews()).filter((v) => !v.meeting).map((v) => ({ id: v.id, label: `${v.venue_code} · ${v.venue_name}` }));
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Create meeting</h1>
      {venues.length === 0
        ? <p className="text-sm text-slate-500">Every venue already has a meeting. Add a venue first, or edit an existing meeting.</p>
        : <MeetingForm action={createMeetingAction} venues={venues} />}
    </div>
  );
}
