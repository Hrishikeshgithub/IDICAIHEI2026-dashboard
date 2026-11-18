import { createAdminClient } from "@/lib/supabase/admin";
import { missingMicrosoftVars } from "@/lib/integrations/microsoft/config";
import { intakeNotifications } from "@/lib/integrations/microsoft/webhook";

export const dynamic = "force-dynamic";

const plain = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });

/**
 * Microsoft Graph webhook receiver (notifications AND lifecycle notifications).
 *  1. Subscription validation: Graph POSTs ?validationToken=...; we must answer 200 text/plain with
 *     the decoded token within 10 seconds.
 *  2. Notifications: validate clientState, enqueue, answer 202 well inside Graph's 3-second window.
 * Not authenticated by session on purpose (Graph has none); authenticity comes from clientState.
 */
export async function POST(request: Request) {
  if (missingMicrosoftVars().length > 0 || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return plain("Microsoft integration is not configured.", 503);
  }

  const token = new URL(request.url).searchParams.get("validationToken");
  if (token !== null) return plain(token, 200);

  try {
    const result = await intakeNotifications(createAdminClient(), await request.text());
    if (!result.ok) return plain(result.reason, result.status);
    return plain("accepted", 202);
  } catch (e) {
    console.error("microsoft webhook intake failed", e instanceof Error ? e.message : e);
    return plain("temporary failure", 500); // 5xx makes Graph retry
  }
}
