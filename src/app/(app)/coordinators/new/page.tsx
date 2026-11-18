import { requireSuperAdmin } from "@/lib/auth";
import { CoordinatorForm } from "../coordinator-form";
import { createCoordinatorAction } from "../actions";

export default async function NewCoordinatorPage() {
  await requireSuperAdmin();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Add coordinator</h1>
      <CoordinatorForm action={createCoordinatorAction} />
    </div>
  );
}
