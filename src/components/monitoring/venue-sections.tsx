import { SeverityBadge } from "./severity-badge";
import { formatDateTime, formatTime } from "@/lib/labels";
import type { EventRecord, MetricRecord, NotificationRecord, ParticipantRecord } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

const card = "rounded-2xl border border-slate-200/70 bg-white shadow-card p-4";

function duration(seconds: number | null, joinedAt: string): string {
  const s = seconds ?? Math.max(0, Math.floor((Date.now() - new Date(joinedAt).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

export function ParticipantsSection({ participants }: { participants: ParticipantRecord[] }) {
  return (
    <section className={cn(card, "md:col-span-2")}>
      <h2 className="text-sm font-semibold text-slate-900">Participant activity</h2>
      <p className="mb-2 text-xs text-slate-500">Most recent {participants.length} joins.</p>
      {participants.length === 0 ? (
        <p className="text-sm text-slate-500">No participant activity yet. Start the simulation to generate some.</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Participant", "Joined", "Left", "Duration"].map((h) => <th key={h} scope="col" className="py-1.5 pr-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {participants.map((p) => (
                <tr key={p.id}>
                  <td className="py-1.5 pr-3 text-slate-800">{p.participant_name}{p.is_coordinator && <span className="ml-2 text-xs text-slate-500">(coordinator)</span>}</td>
                  <td className="py-1.5 pr-3 text-slate-600">{formatTime(p.joined_at)}</td>
                  <td className="py-1.5 pr-3 text-slate-600">{p.left_at ? formatTime(p.left_at) : <span className="text-emerald-700">In session</span>}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-slate-600">{duration(p.duration_seconds, p.joined_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TimelineSection({ events }: { events: EventRecord[] }) {
  return (
    <section className={card}>
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Activity timeline</h2>
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">No events yet.</p>
      ) : (
        <ol className="max-h-80 space-y-2 overflow-auto border-l border-slate-200 pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative text-sm">
              <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-slate-400" aria-hidden />
              <p className="text-slate-800">{e.event_description}</p>
              <time className="text-xs text-slate-400" dateTime={e.event_timestamp}>{formatDateTime(e.event_timestamp)}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const METRIC_LABELS: Record<string, { label: string; unit: string }> = {
  connection_quality: { label: "Connection quality", unit: "/100" },
  latency_ms: { label: "Latency", unit: " ms" },
  packet_loss_pct: { label: "Packet loss", unit: " %" },
  audio_quality: { label: "Audio quality", unit: "/100" },
  video_quality: { label: "Video quality", unit: "/100" },
};

export function TechnicalSection({ metrics, alerts }: { metrics: MetricRecord[]; alerts: NotificationRecord[] }) {
  // metrics arrive newest first: take the first reading per type.
  const latest = new Map<string, MetricRecord>();
  for (const m of metrics) if (!latest.has(m.metric_type)) latest.set(m.metric_type, m);

  return (
    <section className={card}>
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Technical monitoring</h2>
      {latest.size === 0 ? (
        <p className="text-sm text-slate-500">No technical readings yet (only recorded while a session is running).</p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(METRIC_LABELS).map(([key, { label, unit }]) => {
            const r = latest.get(key);
            return (
              <div key={key}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="font-medium tabular-nums text-slate-900">{r ? `${r.metric_value}${unit}` : "—"}</dd>
              </div>
            );
          })}
        </dl>
      )}
      <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent alerts</h3>
      {alerts.length === 0 ? (
        <p className="text-sm text-slate-500">No alerts for this venue.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-sm">
              <SeverityBadge severity={a.severity} />
              <span className="text-slate-700">{a.message}<span className="ml-2 text-xs text-slate-400">{formatTime(a.created_at)}</span></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
