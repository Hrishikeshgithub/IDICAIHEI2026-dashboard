import type { SupabaseClient } from "@supabase/supabase-js";
import { MockMeetingProvider } from "./mock";
import type { MeetingProvider } from "./types";

/**
 * Single place that decides which provider is active (env MEETING_PROVIDER, default "mock").
 * Selecting "microsoft_teams" without a complete configuration throws a clear error instead of
 * silently falling back to the simulator, so demo data can never be mistaken for Teams data.
 */
export async function getMeetingProvider(db: SupabaseClient): Promise<MeetingProvider> {
  if (process.env.MEETING_PROVIDER === "microsoft_teams") {
    // Imported lazily: the Microsoft code is server-only and pulls in nothing in demo mode.
    const { MicrosoftTeamsProvider } = await import("@/lib/integrations/microsoft/teams-provider");
    return new MicrosoftTeamsProvider();
  }
  return new MockMeetingProvider(db);
}

export type { MeetingProvider } from "./types";
