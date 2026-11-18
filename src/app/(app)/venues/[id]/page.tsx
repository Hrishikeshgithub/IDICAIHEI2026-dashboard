import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { getCoordinators, getVenueOverview } from "@/lib/data/queries";
import { VenueForm } from "../venue-form";
import { updateVenueAction } from "../actions";

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const venue = await getVenueOverview(id);
  if (!venue) notFound();
  const coordinators = (await getCoordinators()).filter((c) => c.account_status === "active" || c.id === venue.coordinator_id);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Edit venue · {venue.venue_code}</h1>
      <VenueForm action={updateVenueAction.bind(null, venue.id)} venue={venue} coordinators={coordinators} />
    </div>
  );
}
