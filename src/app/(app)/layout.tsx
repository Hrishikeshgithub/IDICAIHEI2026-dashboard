import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { SimulationControl } from "@/components/layout/simulation-control";
import { RealtimeRefresh } from "@/components/layout/realtime-refresh";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";
import { LogOut } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const roleLabel = user.role === "super_admin" ? "Super Admin" : "Venue Coordinator";

  return (
    <div className="min-h-screen bg-slate-50 md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-slate-200 bg-white md:min-h-screen md:border-b-0 md:border-r">
        <div className="hidden px-5 py-4 md:block">
          <p className="text-sm font-semibold text-slate-900">Conference Ops</p>
          <p className="text-xs text-slate-500">IDICAIHEI-2026</p>
        </div>
        <Sidebar role={user.role} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            DEMO MODE · simulated data
          </Badge>
          <div className="flex items-center gap-3">
            {user.role === "super_admin" && <SimulationControl />}
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user.fullName ?? user.email}</p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="size-4" aria-hidden /> <span className="sr-only sm:not-sr-only">Sign out</span>
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <RealtimeRefresh />
      </div>
    </div>
  );
}
