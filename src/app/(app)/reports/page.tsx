import Link from "next/link";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAttendanceSummaries } from "@/lib/data/reports";
import { parseVenueFilters } from "@/lib/filters";
import { VenueFilters } from "@/components/monitoring/venue-filters";
import { StatusBadge } from "@/components/monitoring/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { CATEGORY_LABELS, formatTime } from "@/lib/labels";

const mins = (s: number | null) => (s === null ? "—" : `${Math.round(s / 60)} min`);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const filters = parseVenueFilters(await searchParams);
  const rows = await getAttendanceSummaries(filters);

  const exportParams = new URLSearchParams();
  if (filters.q) exportParams.set("q", filters.q);
  if (filters.category) exportParams.set("category", filters.category);
  if (filters.status) exportParams.set("status", filters.status);

  const totalAttendees = rows.reduce((n, r) => n + r.total_attendees, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Attendance &amp; Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} venue{rows.length === 1 ? "" : "s"} · {totalAttendees} total attendees. Times are IST.
          </p>
        </div>
        <a href={`/reports/export?${exportParams}`} className={buttonVariants({ variant: "outline" })}>
          <Download className="size-4" aria-hidden /> Export summary CSV
        </a>
      </div>
      <VenueFilters action="/reports" q={filters.q} category={filters.category} status={filters.status} />

      <div className="overflow-x-auto glass rounded-3xl">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-900/[0.06] text-[11px] uppercase tracking-[0.08em] text-slate-500 dark:border-white/[0.06]">
            <tr>
              {["Venue", "Category", "Status", "Session start", "Session end", "Attendees", "Avg participation", "Coordinator", ""].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">No attendance data matches.</td></tr>}
            {rows.map((r) => (
              <tr key={r.meeting_id}>
                <td className="px-3 py-2"><span className="font-medium text-slate-900">{r.venue_code}</span> · {r.venue_name}</td>
                <td className="px-3 py-2 text-slate-600">{CATEGORY_LABELS[r.category]}</td>
                <td className="px-3 py-2"><StatusBadge status={r.meeting_status} /></td>
                <td className="px-3 py-2 text-slate-600">{r.actual_start_time ? formatTime(r.actual_start_time) : <span className="text-slate-400">Not started</span>}</td>
                <td className="px-3 py-2 text-slate-600">{r.actual_end_time ? formatTime(r.actual_end_time) : "—"}</td>
                <td className="px-3 py-2 tabular-nums">{r.total_attendees}<span className="text-slate-400"> / {r.expected_participants} exp.</span></td>
                <td className="px-3 py-2 tabular-nums text-slate-600">{mins(r.avg_duration_seconds)}</td>
                <td className="px-3 py-2 text-slate-600">
                  {r.coordinator_sessions > 0 ? <>{mins(r.coordinator_seconds)}<span className="block text-xs text-slate-400">since {formatTime(r.coordinator_first_joined)}</span></> : <span className="text-slate-400">Did not attend</span>}
                </td>
                <td className="px-3 py-2 text-right"><Link href={`/reports/${r.meeting_id}`} className="text-sm font-medium text-slate-700 hover:underline">Details</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.data_source === "simulated") && <p className="text-xs text-amber-700">Attendance figures are simulated demo data.</p>}
    </div>
  );
}
