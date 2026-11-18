import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS, MEETING_STATUSES, STATUS_LABELS } from "@/lib/labels";

/** GET form: filters live in the URL, so the pages stay server-rendered. */
export function VenueFilters({
  action, q, category, status, showStatus = true,
}: { action: string; q?: string; category?: string; status?: string; showStatus?: boolean }) {
  const field = "h-10 rounded-2xl border border-slate-900/10 bg-white/60 px-3 backdrop-blur dark:border-white/10 text-sm text-slate-900";
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input name="q" defaultValue={q} placeholder="Search venue, city, coordinator…" aria-label="Search" className={`${field} w-full sm:w-64`} />
      <select name="category" defaultValue={category ?? ""} aria-label="Category" className={field}>
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
      </select>
      {showStatus && (
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className={field}>
          <option value="">All statuses</option>
          {MEETING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      )}
      <button type="submit" className="h-10 rounded-2xl bg-slate-900 px-4 text-sm font-medium text-slate-50 hover:bg-slate-800">Apply</button>
      <Link href={action} className="text-sm text-slate-500 hover:text-slate-900">Clear</Link>
    </form>
  );
}
