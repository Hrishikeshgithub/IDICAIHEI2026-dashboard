import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { getAuditFilterOptions, getAuditLogs } from "@/lib/data/queries";
import { formatDateTime } from "@/lib/labels";
import { selectClass } from "@/components/forms/fields";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const labelize = (s: string) => s.replace(/_/g, " ");

export default async function LogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const options = await getAuditFilterOptions();
  // Only accept filter values that actually exist.
  const action = options.actions.includes(first(sp.action) ?? "") ? first(sp.action) : undefined;
  const entity = options.entities.includes(first(sp.entity) ?? "") ? first(sp.entity) : undefined;
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? "1", 10) || 1);

  const { entries, total, pageSize } = await getAuditLogs({ action, entity, page });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const link = (p: number) => {
    const qs = new URLSearchParams();
    if (action) qs.set("action", action);
    if (entity) qs.set("entity", entity);
    qs.set("page", String(p));
    return `/logs?${qs}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Activity Logs</h1>
        <p className="mt-1 text-sm text-slate-500">Audit trail of administrative actions · {total} entries</p>
      </div>

      <form action="/logs" className="flex flex-wrap items-center gap-2">
        <select name="action" defaultValue={action ?? ""} aria-label="Action" className={`${selectClass} w-auto`}>
          <option value="">All actions</option>
          {options.actions.map((a) => <option key={a} value={a}>{labelize(a)}</option>)}
        </select>
        <select name="entity" defaultValue={entity ?? ""} aria-label="Entity" className={`${selectClass} w-auto`}>
          <option value="">All entities</option>
          {options.entities.map((e) => <option key={e} value={e}>{labelize(e)}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-xl bg-slate-900 px-3 text-sm font-medium text-slate-50 hover:bg-slate-800">Apply</button>
        <Link href="/logs" className="text-sm text-slate-500 hover:text-slate-900">Clear</Link>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{["When", "User", "Action", "Entity", "Details"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No log entries.</td></tr>}
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDateTime(e.created_at)}</td>
                <td className="px-3 py-2 text-slate-800">{e.actor ?? <span className="text-slate-400">System</span>}</td>
                <td className="px-3 py-2 capitalize text-slate-800">{labelize(e.action)}</td>
                <td className="px-3 py-2 capitalize text-slate-600">{labelize(e.entity_type)}</td>
                <td className="max-w-[320px] truncate px-3 py-2 font-mono text-xs text-slate-500" title={JSON.stringify(e.details)}>
                  {Object.keys(e.details).length ? JSON.stringify(e.details) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="text-slate-700 hover:underline">← Newer</Link> : <span />}
          <span className="text-slate-500">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="text-slate-700 hover:underline">Older →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
