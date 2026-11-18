import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getAttendanceRows, getAttendanceSummary } from "@/lib/data/reports";
import { StatusBadge } from "@/components/monitoring/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { CATEGORY_LABELS, formatDateTime, formatTime } from "@/lib/labels";

function dur(seconds: number | null, joinedAt: string) {
  const s = seconds ?? Math.max(0, Math.floor((Date.now() - new Date(joinedAt).getTime()) / 1000));
  return `${Math.round(s / 60)} min`;
}

export default async function AttendanceDetailPage({ params }: { params: Promise<{ meetingId: string }> }) {
  await requireUser();
  const { meetingId } = await params;
  if (!z.uuid().safeParse(meetingId).success) notFound();

  const summary = await getAttendanceSummary(meetingId); // RLS: coordinators only get their own venue
  if (!summary) notFound();
  const { rows, total } = await getAttendanceRows(meetingId, 200);

  return (
    <div className="space-y-5">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" aria-hidden /> Attendance &amp; Reports
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{summary.venue_code} · {CATEGORY_LABELS[summary.category]}</p>
          <h1 className="text-xl font-semibold text-slate-900">{summary.venue_name}</h1>
          <p className="text-sm text-slate-500">{summary.meeting_title}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={summary.meeting_status} />
          <a href={`/reports/export?meeting=${summary.meeting_id}`} className={buttonVariants({ variant: "outline" })}>
            <Download className="size-4" aria-hidden /> Export CSV
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Session start", summary.actual_start_time ? formatDateTime(summary.actual_start_time) : "Not started"],
          ["Session end", summary.actual_end_time ? formatDateTime(summary.actual_end_time) : "—"],
          ["Total attendees", `${summary.total_attendees} (expected ${summary.expected_participants})`],
          ["Coordinator attendance", summary.coordinator_sessions > 0 ? `${Math.round(summary.coordinator_seconds / 60)} min` : "Did not attend"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200/70 bg-white shadow-card p-3">
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{["Participant", "Role", "Joined", "Left", "Participation"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No attendance recorded yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-slate-800">{r.participant_name}</td>
                <td className="px-3 py-2 text-slate-600">{r.is_coordinator ? "Coordinator" : "Participant"}</td>
                <td className="px-3 py-2 text-slate-600">{formatTime(r.joined_at)}</td>
                <td className="px-3 py-2 text-slate-600">{r.left_at ? formatTime(r.left_at) : <span className="text-emerald-700">In session</span>}</td>
                <td className="px-3 py-2 tabular-nums text-slate-600">{dur(r.duration_seconds, r.joined_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > rows.length && <p className="text-xs text-slate-500">Showing the first {rows.length} of {total} records. The CSV export contains all of them.</p>}
      {summary.data_source === "simulated" && <p className="text-xs text-amber-700">Attendance data is simulated.</p>}
    </div>
  );
}
