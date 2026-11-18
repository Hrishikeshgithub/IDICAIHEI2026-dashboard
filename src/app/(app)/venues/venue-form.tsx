"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormError, SelectField, TextField } from "@/components/forms/fields";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/labels";
import type { Venue } from "@/lib/types";
import type { FormState } from "./actions";

type Action = (prev: FormState | undefined, fd: FormData) => Promise<FormState>;

export function VenueForm({
  action, venue, coordinators,
}: { action: Action; venue?: Venue; coordinators: { id: string; full_name: string }[] }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="grid max-w-xl gap-4 rounded-2xl border border-slate-200/70 bg-white shadow-card p-5">
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <TextField label="Venue ID" name="venue_code" defaultValue={venue?.venue_code} placeholder="V19" required />
        <TextField label="Venue name" name="venue_name" defaultValue={venue?.venue_name} required />
      </div>
      <SelectField label="Category" name="category" defaultValue={venue?.category} required>
        <option value="" disabled>Select category</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
      </SelectField>
      <TextField label="Physical location" name="location" defaultValue={venue?.location} required />
      <SelectField label="Assigned coordinator" name="coordinator_id" defaultValue={venue?.coordinator_id}>
        <option value="">Unassigned</option>
        {coordinators.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
      </SelectField>
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : venue ? "Save changes" : "Create venue"}</Button>
        <Link href="/venues" className={buttonVariants({ variant: "ghost" })}>Cancel</Link>
      </div>
    </form>
  );
}
