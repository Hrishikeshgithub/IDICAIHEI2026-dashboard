import Link from "next/link";
import { getNotifications } from "@/lib/data/queries";
import { requireUser } from "@/lib/auth";
import { SeverityBadge } from "@/components/monitoring/severity-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { markAllReadAction, markReadAction } from "./actions";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser();
  const { view } = await searchParams;
  const unreadOnly = view === "unread";
  const items = await getNotifications({ unreadOnly });
  const canMark = user.role === "super_admin";
  const tab = (active: boolean) => cn("rounded-xl px-3 py-1.5 text-sm font-medium", active ? "bg-slate-900 text-slate-50" : "text-slate-600 hover:bg-slate-100");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">Alerts raised by the simulation. They are not Microsoft Teams alerts.</p>
        </div>
        {canMark && items.some((n) => !n.is_read) && (
          <form action={markAllReadAction}><Button type="submit" variant="outline" size="sm">Mark all as read</Button></form>
        )}
      </div>
      <div className="flex gap-1">
        <Link href="/notifications" className={tab(!unreadOnly)}>All</Link>
        <Link href="/notifications?view=unread" className={tab(unreadOnly)}>Unread</Link>
      </div>

      {items.length === 0 ? (
        <p className="glass rounded-3xl border-dashed p-8 text-center text-sm text-slate-500">
          {unreadOnly ? "No unread notifications." : "No notifications yet. Start the simulation to generate alerts."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 glass rounded-3xl">
          {items.map((n) => (
            <li key={n.id} className={cn("flex flex-wrap items-center justify-between gap-3 px-4 py-3", !n.is_read && "bg-white/40 dark:bg-white/[0.04]")}>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={n.severity} />
                  {!n.is_read && <span className="text-[11px] font-semibold uppercase text-slate-700">New</span>}
                  <span className="text-[11px] uppercase text-amber-700">{n.data_source === "simulated" ? "simulated" : ""}</span>
                </div>
                <p className="text-sm text-slate-800">{n.message}</p>
                <p className="text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                {n.venue_id && <Link href={`/live-monitoring/${n.venue_id}`} className="text-sm text-slate-600 hover:underline">View venue</Link>}
                {canMark && !n.is_read && (
                  <form action={markReadAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">Mark read</Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
