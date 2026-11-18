"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormError, SelectField, TextField } from "@/components/forms/fields";
import type { Coordinator } from "@/lib/types";
import type { FormState } from "./actions";

type Action = (prev: FormState | undefined, fd: FormData) => Promise<FormState>;

export function CoordinatorForm({ action, coordinator }: { action: Action; coordinator?: Coordinator }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="grid max-w-xl gap-4 rounded-2xl border border-slate-200/70 bg-white shadow-card p-5">
      <TextField label="Full name" name="full_name" defaultValue={coordinator?.full_name} required />
      <TextField label="Email" name="email" type="email" defaultValue={coordinator?.email} required />
      <TextField label="Phone" name="phone" defaultValue={coordinator?.phone ?? ""} />
      <SelectField label="Account status" name="account_status" defaultValue={coordinator?.account_status ?? "active"}>
        <option value="active">Active</option>
        <option value="invited">Invited</option>
        <option value="inactive">Inactive</option>
      </SelectField>
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : coordinator ? "Save changes" : "Add coordinator"}</Button>
        <Link href="/coordinators" className={buttonVariants({ variant: "ghost" })}>Cancel</Link>
      </div>
    </form>
  );
}
