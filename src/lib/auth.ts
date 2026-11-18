import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "super_admin" | "coordinator";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
  coordinatorId: string | null;
}

/** Returns the signed-in user with their app role, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, coordinator_id")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!profile) return null; // signed in but not provisioned -> no access

  return {
    id: auth.user.id,
    email: profile.email ?? auth.user.email ?? null,
    fullName: profile.full_name,
    role: profile.role as AppRole,
    coordinatorId: profile.coordinator_id,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=not_provisioned");
  return user;
}

/** Server-side guard for admin-only pages and actions. */
export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "super_admin") redirect("/");
  return user;
}
