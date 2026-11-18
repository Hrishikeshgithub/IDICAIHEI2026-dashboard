import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { RealtimeRefresh } from "@/components/layout/realtime-refresh";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const roleLabel = user.role === "super_admin" ? "Super Admin" : "Venue Coordinator";

  return (
    <>
      <AmbientBackground />
      <AppShell role={user.role} name={user.fullName ?? user.email ?? "User"} roleLabel={roleLabel}>
        {children}
      </AppShell>
      <RealtimeRefresh />
    </>
  );
}
