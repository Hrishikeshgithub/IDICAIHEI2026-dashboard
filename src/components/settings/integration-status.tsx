import { getMicrosoftStatus } from "@/lib/integrations/microsoft/config";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/labels";

/** Read-only readiness check for the future Microsoft Teams integration. Shows variable names only. */
export async function IntegrationStatus() {
  const status = getMicrosoftStatus();
  const supabase = await createClient();
  const [{ count: pending }, { count: subs }, { data: logs }] = await Promise.all([
    supabase.from("provider_events").select("id", { count: "exact", head: true }).is("processed_at", null),
    supabase.from("integration_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("provider_logs").select("id, level, message, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const teamsSelectedButNotReady = status.selectedProvider === "microsoft_teams" && !status.configured;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white shadow-card p-5">
      <h2 className="text-sm font-semibold text-slate-900">Meeting provider &amp; Microsoft integration</h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">Active provider</dt>
          <dd className="font-medium text-slate-900">{status.selectedProvider === "mock" ? "Mock (demo mode)" : "Microsoft Teams"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Microsoft configuration</dt>
          <dd className="font-medium text-slate-900">{status.configured ? "Complete" : "Not configured"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Webhook queue · subscriptions</dt>
          <dd className="font-medium tabular-nums text-slate-900">{pending ?? 0} pending · {subs ?? 0} active</dd>
        </div>
      </dl>

      {teamsSelectedButNotReady && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          MEETING_PROVIDER is set to microsoft_teams but the configuration is incomplete, so meeting creation will fail until it is fixed.
        </p>
      )}

      <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Server environment (names only, values are never shown)</h3>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {[...status.variables, { name: "CRON_SECRET", set: status.cronSecretSet }, { name: "SUPABASE_SERVICE_ROLE_KEY", set: status.serviceRoleSet }].map((v) => (
          <li key={v.name} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1">
            <code className="text-xs text-slate-700">{v.name}</code>
            <span className={v.set ? "text-emerald-700" : "text-slate-400"}>{v.set ? "set" : "missing"}</span>
          </li>
        ))}
      </ul>

      <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent provider log</h3>
      {(logs ?? []).length === 0 ? (
        <p className="text-sm text-slate-500">No provider activity. Nothing is sent to or received from Microsoft in demo mode.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {logs!.map((l) => (
            <li key={l.id} className="text-slate-700"><span className="uppercase text-xs text-slate-400">{l.level}</span> {l.message} <span className="text-xs text-slate-400">{formatDateTime(l.created_at)}</span></li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-slate-500">Setup steps and the Graph permissions to request are in docs/MICROSOFT_INTEGRATION.md.</p>
    </section>
  );
}
