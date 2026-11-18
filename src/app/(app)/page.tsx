import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getRecentEvents, getVenueOverviews } from "@/lib/data/queries";
import { computeStats } from "@/lib/data/stats";
import { CATEGORY_LABELS, STATUS_LABELS, formatTime } from "@/lib/labels";
import { StatusBadge } from "@/components/monitoring/status-badge";
import { StatusChart } from "@/components/monitoring/status-chart";
import type { MeetingStatus } from "@/lib/types";

const CHART_COLORS: Record<MeetingStatus, string> = {
  scheduled: "#94a3b8", starting: "#0ea5e9", live: "#10b981", waiting: "#f59e0b", ended: "#a1a1aa", technical_issue: "#ef4444",
};

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-card p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default async function OverviewPage() {
  const user = await requireUser();
  const [venues, events] = await Promise.all([getVenueOverviews(), getRecentEvents(8)]);
  const s = computeStats(venues);
  const chart = (Object.keys(STATUS_LABELS) as MeetingStatus[]).map((k) => ({
    label: STATUS_LABELS[k], count: s.byStatus[k], color: CHART_COLORS[k],
  }));

  if (venues.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {user.role === "super_admin" ? (
            <>No venues yet. <Link href="/settings" className="font-medium text-slate-900 underline">Seed the demo data</Link> to populate the dashboard.</>
          ) : (
            "No venue is assigned to your account yet. Contact the administrator."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user.role === "super_admin" ? "Conference status across all venues." : "Status of your assigned venue."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Tile label="Total venues" value={s.totalVenues} />
        <Tile label="Active (live)" value={s.byStatus.live} />
        <Tile label="Scheduled" value={s.byStatus.scheduled} />
        <Tile label="Completed" value={s.byStatus.ended} />
        <Tile label="Waiting to start" value={s.byStatus.waiting + s.byStatus.starting} hint="Waiting + starting" />
        <Tile label="Participants" value={s.totalParticipants} hint="Across all venues" />
        <Tile label="Coordinators connected" value={`${s.coordinatorsConnected}/${s.totalVenues}`} />
        <Tile label="Need attention" value={s.attention.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/70 bg-white shadow-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Meetings by status</h2>
          <p className="mb-2 text-xs text-slate-500">
            {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((c) => `${CATEGORY_LABELS[c]}: ${s.byCategory[c]}`).join(" · ")}
          </p>
          <StatusChart data={chart} />
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white shadow-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Venues requiring attention</h2>
          {s.attention.length === 0 ? (
            <p className="text-sm text-slate-500">All venues are running normally.</p>
          ) : (
            <ul className="space-y-2">
              {s.attention.slice(0, 8).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/live-monitoring/${v.id}`} className="truncate text-slate-800 hover:underline">{v.venue_code} · {v.venue_name}</Link>
                  {v.meeting && <StatusBadge status={v.meeting.meeting_status} />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200/70 bg-white shadow-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent platform activity</h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((e) => {
              const venue = (e.meetings as unknown as { venues: { venue_name: string; venue_code: string } | null } | null)?.venues;
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-slate-700">
                    <span className="font-medium text-slate-900">{venue ? `${venue.venue_code} · ${venue.venue_name}` : "Venue"}</span>
                    {" — "}{e.event_description}
                    {e.data_source === "simulated" && <span className="ml-2 text-[11px] uppercase text-amber-700">simulated</span>}
                  </span>
                  <time className="shrink-0 text-xs text-slate-400" dateTime={e.event_timestamp}>{formatTime(e.event_timestamp)}</time>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
