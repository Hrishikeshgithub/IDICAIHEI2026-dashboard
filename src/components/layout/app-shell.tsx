"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LogOut, Menu, X } from "lucide-react";
import type { AppRole } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar";
import { BrandMark } from "./brand-logo";
import { SimulationControl } from "./simulation-control";
import { ThemeToggle } from "./theme-toggle";

interface ShellProps {
  role: AppRole;
  name: string;
  roleLabel: string;
  children: React.ReactNode;
}

type Pref = "open" | "rail";
const STORAGE_KEY = "sidebar";

function initials(name: string) {
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "U";
}

// lg and up = laptop/desktop; below that (but md and up) = tablet.
function subscribeLg(cb: () => void) {
  const m = window.matchMedia("(min-width: 1024px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const isLg = () => window.matchMedia("(min-width: 1024px)").matches;

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark size={40} />
      <div className={cn("min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-200", compact && "opacity-0")}>
        <p className="font-heading text-[15px] font-semibold leading-tight text-slate-900">Conference Ops</p>
        <p className="text-xs text-slate-500">IDICAIHEI-2026</p>
      </div>
    </div>
  );
}

interface BodyProps extends Omit<ShellProps, "children"> {
  compact?: boolean;
  onNavigate?: () => void;
  /** Hamburger button shown at the top of the desktop/tablet sidebar. */
  onToggle?: () => void;
  toggleLabel?: string;
  expandedState?: boolean;
}

function SidebarBody({ role, name, roleLabel, compact = false, onNavigate, onToggle, toggleLabel, expandedState }: BodyProps) {
  return (
    <>
      <div className="px-3 pb-3 pt-4">
        <div className="flex items-center gap-1">
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={toggleLabel}
              aria-expanded={expandedState}
              aria-controls="app-sidebar"
              title={toggleLabel}
              className="grid size-10 shrink-0 place-items-center rounded-2xl text-slate-700 transition hover:bg-slate-900/[0.06] active:scale-95 dark:hover:bg-white/[0.08]"
            >
              <Menu className="size-5" aria-hidden />
            </button>
          )}
          <div className={cn("min-w-0 flex-1 overflow-hidden transition-all duration-200", compact && onToggle && "w-0 flex-none opacity-0")}>
            <Brand />
          </div>
        </div>
        <div className={cn("overflow-hidden transition-all duration-200", compact ? "h-0 opacity-0" : "mt-3 h-auto opacity-100")}>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden /> Demo mode · simulated data
          </span>
        </div>
      </div>

      <SidebarNav role={role} onNavigate={onNavigate} compact={compact} />

      <div className={cn("space-y-3 border-t border-slate-900/[0.06] p-3 dark:border-white/[0.06]", !compact && "p-4")}>
        {role === "super_admin" && <SimulationControl compact={compact} />}
        {compact ? <div className="flex justify-center"><ThemeToggle /></div> : <ThemeToggle variant="segmented" />}
        <div className={cn("glass flex items-center rounded-2xl", compact ? "flex-col gap-2 p-1.5" : "gap-3 p-2.5")}>
          <div title={compact ? `${name} · ${roleLabel}` : undefined} className="btn-accent grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold">{initials(name)}</div>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              <p className="truncate text-xs text-slate-500">{roleLabel}</p>
            </div>
          )}
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

/**
 * Responsive app frame.
 *  - lg+ (desktop): sidebar starts open; the hamburger collapses it to an icon rail and back.
 *  - md–lg (tablet): starts as a rail; the hamburger opens it over the page with a scrim.
 *  - Collapsed rail on md+: hovering (or keyboard focus) peeks it open over the content, Gmail-style.
 *  - below md (phone): glass top bar + slide-in drawer.
 * The choice made with the hamburger is remembered per browser.
 */
export function AppShell({ role, name, roleLabel, children }: ShellProps) {
  const lg = useSyncExternalStore(subscribeLg, isLg, () => true);
  const [pref, setPref] = useState<Pref | null>(null);
  const [hovered, setHovered] = useState(false);
  const [drawer, setDrawer] = useState(false);
  // Transitions stay off until after first paint so the saved/default state applies instantly on load.
  const [ready, setReady] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only preference
      if (saved === "open" || saved === "rail") setPref(saved);
    } catch { /* storage unavailable: use defaults */ }
  }, []);

  // Pinned open: desktop honours the saved choice (default open); tablet is always a rail unless opened as an overlay.
  const pinnedOpen = pref ? pref === "open" : lg;
  const overlayOpen = !lg && pref === "open"; // tablet: opened by hamburger, floats above content
  const contentOpen = lg && pinnedOpen; // only the desktop layout pushes content aside
  const showFull = pinnedOpen || hovered;

  const choose = useCallback((next: Pref) => {
    setPref(next);
    setHovered(false);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const toggle = () => choose(pinnedOpen ? "rail" : "open");

  const peek = (on: boolean) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(on), on ? 140 : 260);
  };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // phone drawer: lock page scroll and close on Escape
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [drawer]);

  // tablet overlay: Escape closes
  useEffect(() => {
    if (!overlayOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") choose("rail"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen, choose]);

  const closeDrawer = () => setDrawer(false);

  return (
    <div className="min-h-dvh">
      {/* Tablet scrim behind the opened sidebar */}
      {overlayOpen && (
        <button type="button" aria-label="Close menu" onClick={() => choose("rail")} className="fixed inset-0 z-20 hidden animate-in fade-in bg-slate-950/25 backdrop-blur-[2px] duration-300 md:block lg:hidden" />
      )}

      {/* Desktop + tablet sidebar */}
      <aside
        id="app-sidebar"
        onMouseEnter={() => !pinnedOpen && peek(true)}
        onMouseLeave={() => peek(false)}
        onFocus={() => !pinnedOpen && peek(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) peek(false); }}
        className={cn(
          "glass-strong fixed inset-y-3 left-3 z-30 hidden flex-col rounded-[28px] md:flex",
          ready && "transition-[width,box-shadow] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
          showFull ? "w-[17rem]" : "w-[4.75rem]",
          showFull && !pinnedOpen && "shadow-2xl",
        )}
      >
        <SidebarBody
          role={role}
          name={name}
          roleLabel={roleLabel}
          compact={!showFull}
          onToggle={toggle}
          toggleLabel={pinnedOpen ? "Collapse sidebar" : "Expand sidebar"}
          expandedState={pinnedOpen}
          onNavigate={overlayOpen ? () => choose("rail") : undefined}
        />
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-30 px-3 pt-3 md:hidden">
        <div className="glass-strong flex items-center justify-between rounded-2xl px-3 py-2">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              aria-expanded={drawer}
              aria-controls="mobile-drawer"
              className="glass grid size-10 place-items-center rounded-full text-slate-800 active:scale-95"
            >
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Phone drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" aria-label="Close menu" onClick={closeDrawer} className="absolute inset-0 animate-in fade-in bg-slate-950/30 backdrop-blur-sm duration-300" />
          <aside
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="glass-strong absolute inset-y-2 left-2 flex w-[min(20rem,calc(100vw-1rem))] animate-in slide-in-from-left flex-col rounded-[26px] duration-300 ease-out"
          >
            <button
              type="button"
              onClick={closeDrawer}
              autoFocus
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 grid size-9 place-items-center rounded-full text-slate-600 hover:bg-slate-900/[0.06]"
            >
              <X className="size-5" aria-hidden />
            </button>
            <SidebarBody role={role} name={name} roleLabel={roleLabel} onNavigate={closeDrawer} />
          </aside>
        </div>
      )}

      <main
        className={cn(
          "px-3 pb-12 pt-4 sm:px-5 md:pb-10 md:pr-6 md:pt-6",
          ready && "transition-[padding] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]",
          contentOpen ? "md:pl-[19rem]" : "md:pl-[6.25rem]",
        )}
      >
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}
