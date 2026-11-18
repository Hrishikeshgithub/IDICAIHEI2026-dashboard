"use client";

import { useActionState } from "react";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  const message = state?.error ?? notice;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="h-10 rounded-2xl border-slate-900/10 bg-white/60 px-3 backdrop-blur dark:border-white/10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10 rounded-2xl border-slate-900/10 bg-white/60 px-3 backdrop-blur dark:border-white/10" />
      </div>
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      <Button type="submit" className="btn-accent h-11 w-full rounded-2xl border-0 text-sm font-semibold" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
