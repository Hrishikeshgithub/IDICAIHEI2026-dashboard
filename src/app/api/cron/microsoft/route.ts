import { timingSafeEqual, createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { missingMicrosoftVars } from "@/lib/integrations/microsoft/config";
import { createProviderLogger } from "@/lib/integrations/microsoft/logger";
import { processPendingEvents } from "@/lib/integrations/microsoft/processor";
import { renewExpiringSubscriptions } from "@/lib/integrations/microsoft/subscriptions";
import { syncAttendance } from "@/lib/integrations/microsoft/sync";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const a = createHash("sha256").update(header.slice(7)).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/**
 * Scheduled job: processes queued Graph events and renews subscriptions that are close to expiry.
 * Protected by `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically when
 * CRON_SECRET is set). No cron schedule is configured yet — add one when the tenant exists.
 */
async function run(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  if (missingMicrosoftVars().length > 0 || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "Microsoft integration is not configured." }, { status: 503 });
  }
  const db = createAdminClient();
  const log = createProviderLogger(db);
  try {
    const events = await processPendingEvents(db, log);
    const subscriptions = await renewExpiringSubscriptions(db, log);
    const attendance = await syncAttendance(db);
    return Response.json({ events, subscriptions, attendance });
  } catch (e) {
    console.error("microsoft cron failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "Job failed." }, { status: 500 });
  }
}

export { run as GET, run as POST };
