import type { Category, HealthStatus, MeetingStatus } from "@/lib/types";

export const CATEGORY_LABELS: Record<Category, string> = {
  medical_healthcare: "Medical & Healthcare",
  education: "Education",
  industry: "Industry",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export const STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  starting: "Starting",
  live: "Live",
  waiting: "Waiting",
  ended: "Ended",
  technical_issue: "Technical Issue",
};

export const MEETING_STATUSES = Object.keys(STATUS_LABELS) as MeetingStatus[];

// Text + dot classes; status is always shown with a label, never by color alone.
export const STATUS_STYLES: Record<MeetingStatus, { badge: string; dot: string }> = {
  scheduled: { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  starting: { badge: "bg-sky-50 text-sky-800 border-sky-200", dot: "bg-sky-500" },
  live: { badge: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  waiting: { badge: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  ended: { badge: "bg-zinc-100 text-zinc-600 border-zinc-200", dot: "bg-zinc-400" },
  technical_issue: { badge: "bg-red-50 text-red-800 border-red-200", dot: "bg-red-500" },
};

export const HEALTH_LABELS: Record<HealthStatus, string> = {
  good: "Good",
  degraded: "Degraded",
  poor: "Poor",
  unknown: "Unknown",
};

export const HEALTH_STYLES: Record<HealthStatus, string> = {
  good: "text-emerald-700",
  degraded: "text-amber-700",
  poor: "text-red-700",
  unknown: "text-slate-500",
};

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function formatDuration(from: string | null | undefined, to: Date = new Date()): string {
  if (!from) return "—";
  const mins = Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}
