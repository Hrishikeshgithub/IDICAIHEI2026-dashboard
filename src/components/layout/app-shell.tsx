"use client";

import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import type { AppRole } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { SidebarNav } from "./sidebar";
import { SimulationControl } from "./simulation-control";
import { ThemeToggle } from "./theme-toggle";

interface ShellProps {
  role: AppRole;
  name: string;
  roleLabel: string;
  children: React.ReactNode;
}

function initials(name: string) {
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "U";
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="btn-accent grid size-10 place-items-center rounded-2xl text-sm font-bold tracking-tight">IC</div>
      <div className="min-w-0">
        <p className="font-heading text-[15px] font-semibold leading-tight text-slate-900">Conference Ops</p>
        <p className="text-xs text-slate-500">IDICAIHEI-2026</p>
      </div>
    </div>
  );
}

function SidebarBody({ role, name, roleLabel, onNavigate }: Omit<ShellProps, "children"> & { onNavigate?: () => void }) {
  return (
    <>
      <div className="px-5 pb-3 pt-5">
        <Brand />
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden /> Demo mode · simulated data
        </span>
      </div>

      <SidebarNav role={role} onNavigate={onNavigate} />

      <div className="space-y-3 border-t border-slate-900/[0.06] p-4 dark:border-white/[0.06]">
        {role === "super_admin" && <SimulationControl />}
        <ThemeToggle variant="segmented" />
        <div className="glass flex items-center gap-3 rounded-2xl p-2.5">
          <div className="btn-accent grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold">{initials(name)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{roleLabel}</p>
          </div>
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
 *  - lg and up: floating glass sidebar fixed to the left; its nav scrolls independently.
 *  - below lg: glass top bar with a menu button that opens the same sidebar as a drawer.
 */
export function AppShell({ role, name, roleLabel, children }: ShellProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // keep the page still behind the drawer
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="glass-strong fixed inset-y-3 left-3 z-30 hidden w-[17rem] flex-col rounded-[28px] lg:flex">
        <SidebarBody role={role} name={name} roleLabel={roleLabel} />
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-30 px-3 pt-3 lg:hidden">
        <div className="glass-strong flex items-center justify-between rounded-2xl px-3 py-2">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-drawer"
              className="glass grid size-10 place-items-center rounded-full text-slate-800 active:scale-95"
            >
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={close} className="absolute inset-0 animate-in fade-in bg-slate-950/30 backdrop-blur-sm duration-300" />
          <aside
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="glass-strong absolute inset-y-2 left-2 flex w-[min(20rem,calc(100vw-1rem))] animate-in slide-in-from-left flex-col rounded-[26px] duration-300 ease-out"
          >
            <button
              type="button"
              onClick={close}
              autoFocus
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 grid size-9 place-items-center rounded-full text-slate-600 hover:bg-slate-900/[0.06]"
            >
              <X className="size-5" aria-hidden />
            </button>
            <SidebarBody role={role} name={name} roleLabel={roleLabel} onNavigate={close} />
          </aside>
        </div>
      )}

      <main className="px-3 pb-12 pt-4 sm:px-5 lg:pb-10 lg:pl-[19rem] lg:pr-6 lg:pt-6">
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}
