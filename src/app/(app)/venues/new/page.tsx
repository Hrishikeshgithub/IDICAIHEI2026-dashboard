import { requireSuperAdmin } from "@/lib/auth";
import { getCoordinators } from "@/lib/data/queries";
import { VenueForm } from "../venue-form";
import { createVenueAction } from "../actions";

export default async function NewVenuePage() {
  await requireSuperAdmin();
  const coordinators = (await getCoordinators()).filter((c) => !c.venue && c.account_status === "active");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Add venue</h1>
      <VenueForm action={createVenueAction} coordinators={coordinators} />
    </div>
  );
}
