"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Read state is updated through the user's own session; RLS decides which notifications they may touch.
// (Coordinators have read-only access, so marking read is effectively admin-only for now.)
export async function markReadAction(fd: FormData) {
  await requireUser();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", id.data);
  revalidatePath("/notifications");
}

export async function markAllReadAction() {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  revalidatePath("/notifications");
}
