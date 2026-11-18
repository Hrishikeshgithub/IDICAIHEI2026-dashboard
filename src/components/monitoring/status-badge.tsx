import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/labels";
import type { MeetingStatus } from "@/lib/types";

export function StatusBadge({ status, className }: { status: MeetingStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", s.badge, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
