import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getMeetingActivity, getVenueOverview } from "@/lib/data/queries";
import { StatusBadge } from "@/components/monitoring/status-badge";
import { ParticipantsSection, ScheduleSection, TechnicalSection, TimelineSection } from "@/components/monitoring/venue-sections";
import { CATEGORY_LABELS, HEALTH_LABELS, formatDateTime, formatDuration } from "@/lib/labels";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = await getVenueOverview(id); // RLS: coordinators only get their own venue
  if (!venue) notFound();
  const m = venue.meeting;
  const activity = m ? await getMeetingActivity(m.id) : { participants: [], events: [], metrics: [], alerts: [] };

  return (
    <div className="space-y-5">
      <Link href="/live-monitoring" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="size-4" aria-hidden /> Live Monitoring
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{venue.venue_code} · {CATEGORY_LABELS[venue.category]} · Day {venue.day_number} · {venue.mode === "online" ? "Online" : "In person"}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{venue.venue_name}</h1>
          <p className="text-sm text-slate-500">{venue.location}</p>
        </div>
        <div className="flex items-center gap-3">
          {m && <StatusBadge status={m.meeting_status} />}
          {m?.join_url && (
            <a href={m.join_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-50 hover:bg-slate-800">
              Open Meeting <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>

      {m ? (
        <div className="grid gap-5 md:grid-cols-2">
          <section className="glass rounded-3xl p-4">
            <h2 className="text-sm font-semibold text-slate-900">Meeting information</h2>
            <dl className="mt-2 divide-y divide-slate-100">
              <Row label="Title">{m.meeting_title}</Row>
              {venue.subtrack && <Row label="Subtrack">{venue.subtrack}</Row>}
              {venue.session_chairs && <Row label="Session chairs">{venue.session_chairs}</Row>}
              {venue.floor && <Row label="Floor">{venue.floor}</Row>}
              <Row label="Schedule">{formatDateTime(m.start_time)} – {formatDateTime(m.end_time)}</Row>
              <Row label="Provider">{m.meeting_provider === "mock" ? "Mock (demo)" : "Microsoft Teams"}</Row>
              <Row label="Coordinator">{venue.coordinator?.full_name ?? "Unassigned"}</Row>
              <Row label="Coordinator email">{venue.coordinator?.email ?? "—"}</Row>
            </dl>
          </section>
          <section className="glass rounded-3xl p-4">
            <h2 className="text-sm font-semibold text-slate-900">Live statistics</h2>
            <dl className="mt-2 divide-y divide-slate-100">
              <Row label="Participants">{m.current_participants} / {m.expected_participants} expected</Row>
              <Row label="Duration">{m.actual_start_time && m.meeting_status !== "ended" ? formatDuration(m.actual_start_time) : "—"}</Row>
              <Row label="Coordinator">{m.coordinator_present ? "Connected" : "Not connected"}</Row>
              <Row label="Technical health">{HEALTH_LABELS[m.health_status]}</Row>
              <Row label="Data source">{m.data_source === "simulated" ? "Simulated (demo)" : "Provider"}</Row>
            </dl>
          </section>
          <ScheduleSection blocks={m.schedule} />
          <TechnicalSection metrics={activity.metrics} alerts={activity.alerts} />
          <TimelineSection events={activity.events} />
          <ParticipantsSection participants={activity.participants} />
          {m.data_source === "simulated" && (
            <p className="text-xs text-amber-700 md:col-span-2">All participant, timeline and technical data on this page is simulated.</p>
          )}
        </div>
      ) : (
        <p className="glass rounded-3xl border-dashed p-8 text-center text-sm text-slate-500">No meeting is configured for this venue.</p>
      )}
    </div>
  );
}
