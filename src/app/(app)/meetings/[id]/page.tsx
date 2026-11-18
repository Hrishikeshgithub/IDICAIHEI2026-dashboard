import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { getVenueOverviews } from "@/lib/data/queries";
import { MeetingForm } from "../meeting-form";
import { updateMeetingAction } from "../actions";

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const venue = (await getVenueOverviews()).find((v) => v.meeting?.id === id);
  if (!venue?.meeting) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Edit meeting · {venue.venue_code}</h1>
      <MeetingForm
        action={updateMeetingAction.bind(null, id)}
        meeting={venue.meeting}
        venues={[{ id: venue.id, label: `${venue.venue_code} · ${venue.venue_name}` }]}
        lockVenue
      />
    </div>
  );
}
