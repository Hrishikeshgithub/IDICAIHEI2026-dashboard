import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { getCoordinatorHistory, getCoordinators } from "@/lib/data/queries";
import { formatDateTime, formatTime } from "@/lib/labels";
import { CoordinatorForm } from "../coordinator-form";
import { updateCoordinatorAction } from "../actions";

export default async function EditCoordinatorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const coordinator = (await getCoordinators()).find((c) => c.id === id);
  if (!coordinator) notFound();
  const history = await getCoordinatorHistory(coordinator.id, coordinator.email);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Edit coordinator</h1>
      <CoordinatorForm action={updateCoordinatorAction.bind(null, coordinator.id)} coordinator={coordinator} />

      <section className="max-w-xl glass rounded-3xl p-5">
        <h2 className="text-sm font-semibold text-slate-900">Session history</h2>
        {history.sessions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No sessions attended yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {history.sessions.map((s) => {
              const meeting = s.meetings as unknown as { meeting_title: string; venues: { venue_code: string; venue_name: string } | null } | null;
              return (
                <li key={s.id} className="py-2 text-sm">
                  <p className="text-slate-800">{meeting?.venues ? `${meeting.venues.venue_code} · ${meeting.venues.venue_name}` : "Venue"} — {meeting?.meeting_title}</p>
                  <p className="text-xs text-slate-500">
                    Joined {formatTime(s.joined_at)} · {s.left_at ? `left ${formatTime(s.left_at)}` : "still connected"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <h2 className="mt-5 text-sm font-semibold text-slate-900">Record changes</h2>
        {history.changes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No changes recorded.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {history.changes.map((c) => (
              <li key={c.id}><span className="capitalize">{c.action.replace(/_/g, " ")}</span> <span className="text-xs text-slate-400">{formatDateTime(c.created_at)}</span></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
