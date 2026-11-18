"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import type { AppRole } from "@/lib/auth";

/** Navigation list. Scrolls on its own when it doesn't fit, and keeps the active item in view. */
export function SidebarNav({ role, onNavigate, compact = false }: { role: AppRole; onNavigate?: () => void; compact?: boolean }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pathname]);

  return (
    <nav aria-label="Main" className="thin-scroll flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-2">
      <p className={cn("overflow-hidden whitespace-nowrap px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 transition-all duration-200", compact && "h-0 py-0 opacity-0")}>Workspace</p>
      {items.map(({ label, href, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            ref={active ? activeRef : undefined}
            onClick={onNavigate}
            title={compact ? label : undefined}
            aria-label={compact ? label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl px-2 py-2 text-sm font-medium transition-all duration-200",
              active ? "glass text-slate-900" : "text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-900 dark:hover:bg-white/[0.06]",
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-xl transition-colors",
                active ? "btn-accent" : "bg-slate-900/[0.05] text-slate-500 group-hover:text-slate-800 dark:bg-white/[0.06]",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className={cn("overflow-hidden whitespace-nowrap transition-opacity duration-200", compact ? "opacity-0" : "opacity-100")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
