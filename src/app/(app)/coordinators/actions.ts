"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { coordinatorSchema, dbMessage, firstError } from "@/lib/validation";

export interface FormState { error?: string }

export async function createCoordinatorAction(_p: FormState | undefined, fd: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const parsed = coordinatorSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coordinators").insert({ ...parsed.data, data_source: "simulated" }).select("id").single();
  if (error) return { error: dbMessage(error, "Could not add the coordinator.") };
  await logAudit(supabase, user.id, "create", "coordinator", data.id, parsed.data);
  revalidatePath("/", "layout");
  redirect("/coordinators");
}

export async function updateCoordinatorAction(id: string, _p: FormState | undefined, fd: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const parsed = coordinatorSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("coordinators").update(parsed.data).eq("id", id);
  if (error) return { error: dbMessage(error, "Could not update the coordinator.") };
  await logAudit(supabase, user.id, "update", "coordinator", id, parsed.data);
  revalidatePath("/", "layout");
  redirect("/coordinators");
}

export async function deleteCoordinatorAction(id: string) {
  const user = await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("coordinators").delete().eq("id", id);
  if (error) return;
  await logAudit(supabase, user.id, "delete", "coordinator", id);
  revalidatePath("/", "layout");
}

const assignSchema = z.object({ coordinator_id: z.uuid(), venue_id: z.uuid() });

/** Adds a session to a coordinator. A session has one coordinator; a coordinator may have many sessions. */
export async function assignCoordinatorAction(fd: FormData) {
  const user = await requireSuperAdmin();
  const parsed = assignSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return;
  const { coordinator_id, venue_id } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("venues").update({ coordinator_id }).eq("id", venue_id);
  if (error) return;
  await logAudit(supabase, user.id, "assign_coordinator", "coordinator", coordinator_id, { venue_id });
  revalidatePath("/", "layout");
}
