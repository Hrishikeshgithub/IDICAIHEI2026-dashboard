import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/labels";
import type { MeetingStatus } from "@/lib/types";

export function StatusBadge({ status, className }: { status: MeetingStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur", s.badge, className)}>
      <span className="relative flex size-1.5" aria-hidden>
        {(status === "live" || status === "technical_issue") && (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-70 motion-reduce:animate-none", s.dot)} />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", s.dot)} />
      </span>
      {STATUS_LABELS[status]}
    </span>
  );
}
