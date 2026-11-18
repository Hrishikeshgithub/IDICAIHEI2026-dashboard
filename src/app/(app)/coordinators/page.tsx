import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { getCoordinators, getVenueOverviews } from "@/lib/data/queries";
import { DeleteButton } from "@/components/forms/delete-button";
import { buttonVariants } from "@/components/ui/button";
import { selectClass } from "@/components/forms/fields";
import { formatTime } from "@/lib/labels";
import { assignCoordinatorAction, deleteCoordinatorAction } from "./actions";

export default async function CoordinatorsPage() {
  await requireSuperAdmin();
  const [coordinators, venues] = await Promise.all([getCoordinators(), getVenueOverviews()]);
  const meetingByVenue = new Map(venues.map((v) => [v.id, v.meeting]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Coordinators</h1>
          <p className="mt-1 text-sm text-slate-500">{coordinators.length} coordinators</p>
        </div>
        <Link href="/coordinators/new" className={buttonVariants()}>Add coordinator</Link>
      </div>

      <div className="overflow-x-auto glass rounded-3xl">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-900/[0.06] text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:border-white/[0.06]">
            <tr>{["Name", "Email", "Account", "Session presence", "Assigned venue", ""].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {coordinators.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No coordinators yet.</td></tr>}
            {coordinators.map((c) => {
              const present = c.venue ? meetingByVenue.get(c.venue.id)?.coordinator_present : false;
              return (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{c.full_name}</td>
                  <td className="px-3 py-2 text-slate-600">{c.email}</td>
                  <td className="px-3 py-2 capitalize text-slate-600">{c.account_status}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {present ? "Connected" : "Not connected"}
                    {c.last_seen_at && <span className="block text-xs text-slate-400">Last seen {formatTime(c.last_seen_at)}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <form action={assignCoordinatorAction} className="flex items-center gap-2">
                      <input type="hidden" name="coordinator_id" value={c.id} />
                      <select name="venue_id" defaultValue={c.venue?.id ?? ""} aria-label={`Venue for ${c.full_name}`} className={`${selectClass} max-w-[240px]`}>
                        <option value="">Unassigned</option>
                        {venues.map((v) => <option key={v.id} value={v.id}>{v.venue_code} · {v.venue_name}</option>)}
                      </select>
                      <button type="submit" className="text-sm font-medium text-slate-700 hover:underline">Save</button>
                    </form>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/coordinators/${c.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>Edit</Link>
                      <DeleteButton action={deleteCoordinatorAction.bind(null, c.id)} label={c.full_name} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Activity history per coordinator is added with the activity log in Phase 4. Reassigning a coordinator replaces the venue&apos;s current one.</p>
    </div>
  );
}
