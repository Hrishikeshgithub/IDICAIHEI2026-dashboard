import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { getVenueOverviews } from "@/lib/data/queries";
import { parseVenueFilters } from "@/lib/filters";
import { VenueFilters } from "@/components/monitoring/venue-filters";
import { StatusBadge } from "@/components/monitoring/status-badge";
import { DeleteButton } from "@/components/forms/delete-button";
import { buttonVariants } from "@/components/ui/button";
import { CATEGORY_LABELS, formatDateTime } from "@/lib/labels";
import { deleteVenueAction } from "./actions";

export default async function VenuesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSuperAdmin();
  const filters = parseVenueFilters(await searchParams);
  const venues = await getVenueOverviews(filters);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Venues</h1>
          <p className="mt-1 text-sm text-slate-500">{venues.length} venue{venues.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/venues/new" className={buttonVariants()}>Add venue</Link>
      </div>
      <VenueFilters action="/venues" q={filters.q} category={filters.category} status={filters.status} />

      <div className="overflow-x-auto glass rounded-3xl">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-900/[0.06] text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:border-white/[0.06]">
            <tr>
              {["ID", "Venue", "Category", "Location", "Coordinator", "Meeting", "Schedule", "Status", "Participants", ""].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {venues.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No venues match.</td></tr>
            )}
            {venues.map((v) => (
              <tr key={v.id}>
                <td className="px-3 py-2 font-medium text-slate-900">{v.venue_code}</td>
                <td className="px-3 py-2">{v.venue_name}</td>
                <td className="px-3 py-2 text-slate-600">{CATEGORY_LABELS[v.category]}</td>
                <td className="px-3 py-2 text-slate-600">{v.location}</td>
                <td className="px-3 py-2">
                  {v.coordinator ? <>{v.coordinator.full_name}<br /><span className="text-xs text-slate-500">{v.coordinator.email}</span></> : <span className="text-slate-400">Unassigned</span>}
                </td>
                <td className="max-w-[220px] truncate px-3 py-2 text-slate-600" title={v.meeting?.meeting_title}>{v.meeting?.meeting_title ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{v.meeting ? `${formatDateTime(v.meeting.start_time)} – ${formatDateTime(v.meeting.end_time)}` : "—"}</td>
                <td className="px-3 py-2">{v.meeting ? <StatusBadge status={v.meeting.meeting_status} /> : "—"}</td>
                <td className="px-3 py-2 tabular-nums">{v.meeting ? `${v.meeting.current_participants} / ${v.meeting.expected_participants}` : "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/venues/${v.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>Edit</Link>
                    <DeleteButton action={deleteVenueAction.bind(null, v.id)} label={v.venue_name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
