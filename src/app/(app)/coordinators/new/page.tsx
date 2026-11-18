import { requireSuperAdmin } from "@/lib/auth";
import { CoordinatorForm } from "../coordinator-form";
import { createCoordinatorAction } from "../actions";

export default async function NewCoordinatorPage() {
  await requireSuperAdmin();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Add coordinator</h1>
      <CoordinatorForm action={createCoordinatorAction} />
    </div>
  );
}
