import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { getVenueOverviews } from "@/lib/data/queries";
import { parseVenueFilters } from "@/lib/filters";
import { VenueFilters } from "@/components/monitoring/venue-filters";
import { StatusBadge } from "@/components/monitoring/status-badge";
import { DeleteButton } from "@/components/forms/delete-button";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/labels";
import { deleteMeetingAction } from "./actions";

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSuperAdmin();
  const filters = parseVenueFilters(await searchParams);
  const rows = (await getVenueOverviews(filters)).filter((v) => v.meeting);
  const venuesAll = await getVenueOverviews();
  const withoutMeeting = venuesAll.filter((v) => !v.meeting).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Meetings</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} meetings{withoutMeeting > 0 && ` · ${withoutMeeting} venue(s) without a meeting`}</p>
        </div>
        <Link href="/meetings/new" className={buttonVariants()}>Create meeting</Link>
      </div>
      <VenueFilters action="/meetings" q={filters.q} category={filters.category} status={filters.status} day={filters.day} />

      <div className="overflow-x-auto glass rounded-3xl">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-900/[0.06] text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:border-white/[0.06]">
            <tr>{["Venue", "Title", "Coordinator", "Schedule (IST)", "Status", "Link", ""].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No meetings match.</td></tr>}
            {rows.map((v) => {
              const m = v.meeting!;
              return (
                <tr key={m.id}>
                  <td className="px-3 py-2"><span className="font-medium text-slate-900">{v.venue_code}</span> · {v.venue_name}</td>
                  <td className="max-w-[240px] truncate px-3 py-2 text-slate-700" title={m.meeting_title}>{m.meeting_title}</td>
                  <td className="px-3 py-2 text-slate-600">{v.coordinator?.full_name ?? <span className="text-slate-400">Unassigned</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{formatDateTime(m.start_time)} – {formatDateTime(m.end_time)}</td>
                  <td className="px-3 py-2"><StatusBadge status={m.meeting_status} /></td>
                  <td className="px-3 py-2">
                    {m.join_url ? (
                      <a href={m.join_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-700 hover:underline">
                        Open <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/meetings/${m.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>Edit</Link>
                      <DeleteButton action={deleteMeetingAction.bind(null, m.id)} label={m.meeting_title} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
