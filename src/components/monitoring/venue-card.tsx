import Link from "next/link";
import { ExternalLink, UserCheck, UserX, Users } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { CATEGORY_LABELS, HEALTH_LABELS, HEALTH_STYLES, formatDuration, formatTime } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { VenueOverview } from "@/lib/types";

/** Operational card for one venue. Shows metadata only — never live audio/video. */
export function VenueCard({ venue }: { venue: VenueOverview }) {
  const m = venue.meeting;
  const running = m && ["live", "technical_issue", "starting", "waiting"].includes(m.meeting_status);

  return (
    <article className="flex flex-col glass lift rounded-3xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{venue.venue_code} · {CATEGORY_LABELS[venue.category]}</p>
          <h3 className="truncate text-sm font-semibold text-slate-900" title={venue.venue_name}>
            <Link href={`/live-monitoring/${venue.id}`} className="hover:underline">{venue.venue_name}</Link>
          </h3>
          <p className="truncate text-xs text-slate-500">{venue.location}</p>
        </div>
        {m ? <StatusBadge status={m.meeting_status} /> : <span className="text-xs text-slate-400">No meeting</span>}
      </div>

      {m ? (
        <>
          <p className="mt-3 truncate text-xs text-slate-600" title={m.meeting_title}>{m.meeting_title}</p>
          {m.expected_participants > 0 && (
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Participants versus expected"
              aria-valuemin={0}
              aria-valuemax={m.expected_participants}
              aria-valuenow={m.current_participants}
            >
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.min(100, Math.round((m.current_participants / m.expected_participants) * 100))}%` }} />
            </div>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-slate-500">Participants</dt>
              <dd className="flex items-center gap-1 font-medium text-slate-900">
                <Users className="size-3.5" aria-hidden /> {m.current_participants}
                <span className="font-normal text-slate-400">/ {m.expected_participants}</span>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Coordinator</dt>
              <dd className={cn("flex items-center gap-1 font-medium", m.coordinator_present ? "text-emerald-700" : "text-slate-500")}>
                {m.coordinator_present ? <UserCheck className="size-3.5" aria-hidden /> : <UserX className="size-3.5" aria-hidden />}
                {m.coordinator_present ? "Connected" : "Not connected"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Started</dt>
              <dd className="font-medium text-slate-900">{formatTime(m.actual_start_time ?? m.start_time)}{!m.actual_start_time && <span className="font-normal text-slate-400"> (sched.)</span>}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Duration</dt>
              <dd className="font-medium text-slate-900">{running && m.actual_start_time ? formatDuration(m.actual_start_time) : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last activity</dt>
              <dd className="font-medium text-slate-900">{formatTime(m.last_activity_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tech health</dt>
              <dd className={cn("font-medium", HEALTH_STYLES[m.health_status])}>{HEALTH_LABELS[m.health_status]}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <span className="text-[11px] uppercase tracking-wide text-amber-700">{m.data_source === "simulated" ? "Simulated" : ""}</span>
            {m.join_url ? (
              <a
                href={m.join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Open Meeting <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : (
              <span className="text-xs text-slate-400">No link</span>
            )}
          </div>
        </>
      ) : null}
    </article>
  );
}
