"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { dbMessage, firstError, venueSchema } from "@/lib/validation";
import { getConference } from "@/lib/data/queries";

export interface FormState { error?: string }

export async function createVenueAction(_p: FormState | undefined, fd: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const parsed = venueSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const conference = await getConference();
  if (!conference) return { error: "Create or seed a conference first (Settings)." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues").insert({ ...parsed.data, conference_id: conference.id }).select("id").single();
  if (error) return { error: dbMessage(error, "Could not create the venue.") };

  await logAudit(supabase, user.id, "create", "venue", data.id, parsed.data);
  revalidatePath("/", "layout");
  redirect("/venues");
}

export async function updateVenueAction(id: string, _p: FormState | undefined, fd: FormData): Promise<FormState> {
  const user = await requireSuperAdmin();
  const parsed = venueSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("venues").update(parsed.data).eq("id", id);
  if (error) return { error: dbMessage(error, "Could not update the venue.") };

  await logAudit(supabase, user.id, "update", "venue", id, parsed.data);
  revalidatePath("/", "layout");
  redirect("/venues");
}

export async function deleteVenueAction(id: string) {
  const user = await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("venues").delete().eq("id", id);
  if (error) return;
  await logAudit(supabase, user.id, "delete", "venue", id);
  revalidatePath("/", "layout");
}
