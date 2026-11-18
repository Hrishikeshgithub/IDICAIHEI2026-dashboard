import type { Category, MeetingStatus, VenueOverview } from "@/lib/types";

export interface OverviewStats {
  totalVenues: number;
  byStatus: Record<MeetingStatus, number>;
  totalParticipants: number;
  coordinatorsConnected: number;
  attention: VenueOverview[];
  byCategory: Record<Category, number>;
}

const RUNNING: MeetingStatus[] = ["live", "starting", "waiting", "technical_issue"];

export function computeStats(venues: VenueOverview[]): OverviewStats {
  const byStatus: Record<MeetingStatus, number> = {
    scheduled: 0, starting: 0, live: 0, waiting: 0, ended: 0, technical_issue: 0,
  };
  const byCategory: Record<Category, number> = { medical_healthcare: 0, education: 0, industry: 0 };
  let totalParticipants = 0;
  let coordinatorsConnected = 0;

  for (const v of venues) {
    byCategory[v.category]++;
    const m = v.meeting;
    if (!m) continue;
    byStatus[m.meeting_status]++;
    totalParticipants += m.current_participants;
    if (m.coordinator_present) coordinatorsConnected++;
  }

  // A venue needs attention when it has a technical issue, is waiting past its start,
  // or its session is running without a connected coordinator.
  const attention = venues.filter((v) => {
    const m = v.meeting;
    if (!m) return false;
    return (
      m.meeting_status === "technical_issue" ||
      m.meeting_status === "waiting" ||
      (RUNNING.includes(m.meeting_status) && !m.coordinator_present)
    );
  });

  return { totalVenues: venues.length, byStatus, totalParticipants, coordinatorsConnected, attention, byCategory };
}
