import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const MAP = {
  info: { label: "Info", cls: "bg-sky-50 text-sky-800 border-sky-200", Icon: Info },
  warning: { label: "Warning", cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: AlertTriangle },
  critical: { label: "Critical", cls: "bg-red-50 text-red-800 border-red-200", Icon: OctagonAlert },
} as const;

export function SeverityBadge({ severity }: { severity: keyof typeof MAP }) {
  const { label, cls, Icon } = MAP[severity];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cls)}>
      <Icon className="size-3" aria-hidden /> {label}
    </span>
  );
}
