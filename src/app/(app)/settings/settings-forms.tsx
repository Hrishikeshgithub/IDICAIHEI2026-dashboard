"use client";

import { useActionState, useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Conference } from "@/lib/types";
import { resetDemoAction, seedDemoAction, updateConferenceAction, type ActionState } from "./actions";

export function ConferenceForm({ conference }: { conference: Conference }) {
  const [state, action, pending] = useActionState(updateConferenceAction, undefined);
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <input type="hidden" name="id" value={conference.id} />
      <div className="grid gap-1.5">
        <Label htmlFor="name">Conference name</Label>
        <Input id="name" name="name" defaultValue={conference.name} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="start_date">Start date</Label>
          <Input id="start_date" name="start_date" type="date" defaultValue={conference.start_date} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="end_date">End date</Label>
          <Input id="end_date" name="end_date" type="date" defaultValue={conference.end_date} required />
        </div>
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-emerald-700">{state.ok}</p>}
      <div><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></div>
    </form>
  );
}

export function DemoDataControls({ hasData }: { hasData: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState>();
  const [confirming, setConfirming] = useState(false);

  const run = (fn: () => Promise<ActionState>) =>
    start(async () => { setResult(await fn()); setConfirming(false); });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={pending || hasData} onClick={() => run(seedDemoAction)}>
          {pending && !confirming ? "Working…" : "Seed demo programme (24 sessions)"}
        </Button>
        {!confirming ? (
          <Button variant="outline" disabled={pending || !hasData} onClick={() => setConfirming(true)}>
            Reset demo data
          </Button>
        ) : (
          <>
            <Button variant="destructive" disabled={pending} onClick={() => run(resetDemoAction)}>
              Confirm: delete all sessions, meetings and demo coordinators
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
          </>
        )}
      </div>
      {result?.error && <p role="alert" className="text-sm text-red-600">{result.error}</p>}
      {result?.ok && <p role="status" className="text-sm text-emerald-700">{result.ok}</p>}
    </div>
  );
}
