"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  linkTeamsMeetingsAction, syncTeamsAttendanceAction, testMicrosoftConnectionAction,
} from "@/app/(app)/settings/integration-actions";

type Result = { ok: boolean; lines: string[] };

/** Admin buttons for the Microsoft Teams connection. Each one reports plainly what happened. */
export function IntegrationActions() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result>();

  const run = (fn: () => Promise<Result>) => start(async () => setResult(await fn()));

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending} onClick={() => run(testMicrosoftConnectionAction)}>Test connection</Button>
        <Button variant="outline" disabled={pending} onClick={() => run(linkTeamsMeetingsAction)}>Link Teams meetings</Button>
        <Button variant="outline" disabled={pending} onClick={() => run(syncTeamsAttendanceAction)}>Sync attendance</Button>
      </div>
      {pending && <p role="status" className="text-sm text-slate-500">Working…</p>}
      {result && !pending && (
        <div role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-emerald-700" : "text-sm text-red-600"}>
          {result.lines.map((l) => <p key={l}>{l}</p>)}
        </div>
      )}
      <p className="text-xs text-slate-500">
        Order: test the connection, link the Teams meetings (needs real join links on the sessions), then sync attendance after sessions end.
      </p>
    </div>
  );
}
