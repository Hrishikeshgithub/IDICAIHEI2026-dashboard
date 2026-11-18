"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { resetDemoData, seedDemoData } from "@/lib/simulation/seed";

export interface ActionState { ok?: string; error?: string }

export async function seedDemoAction(): Promise<ActionState> {
  const user = await requireSuperAdmin();
  const supabase = await createClient();
  try {
    const { venues, coordinators } = await seedDemoData(supabase);
    await logAudit(supabase, user.id, "seed_demo_data", "conference", null, { venues, coordinators });
    revalidatePath("/", "layout");
    return { ok: `Seeded ${venues} sessions and ${coordinators} coordinators.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Seeding failed." };
  }
}

export async function resetDemoAction(): Promise<ActionState> {
  const user = await requireSuperAdmin();
  const supabase = await createClient();
  try {
    await resetDemoData(supabase);
    await logAudit(supabase, user.id, "reset_demo_data", "conference");
    revalidatePath("/", "layout");
    return { ok: "Demo data removed." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Reset failed." };
  }
}

const confSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(3).max(160),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
}).refine((v) => v.end_date >= v.start_date, { message: "End date must be on or after the start date." });

export async function updateConferenceAction(_p: ActionState | undefined, fd: FormData): Promise<ActionState> {
  const user = await requireSuperAdmin();
  const parsed = confSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("conferences").update(fields).eq("id", id);
  if (error) return { error: "Could not save conference settings." };
  await logAudit(supabase, user.id, "update", "conference", id, fields);
  revalidatePath("/", "layout");
  return { ok: "Conference settings saved." };
}
