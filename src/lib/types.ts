export type Category = "medical_healthcare" | "education" | "industry";
export type MeetingStatus = "scheduled" | "starting" | "live" | "waiting" | "ended" | "technical_issue";
export type HealthStatus = "good" | "degraded" | "poor" | "unknown";
export type DataSource = "simulated" | "provider";
export type AccountStatus = "active" | "inactive" | "invited";

export interface Conference {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  demo_mode: boolean;
}

export interface Coordinator {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  account_status: AccountStatus;
  is_connected: boolean;
  last_seen_at: string | null;
  data_source: DataSource;
}

export interface Meeting {
  id: string;
  venue_id: string;
  meeting_title: string;
  meeting_provider: "mock" | "microsoft_teams";
  external_meeting_id: string | null;
  join_url: string | null;
  start_time: string;
  end_time: string;
  meeting_status: MeetingStatus;
  expected_participants: number;
  current_participants: number;
  coordinator_present: boolean;
  actual_start_time: string | null;
  actual_end_time: string | null;
  last_activity_at: string | null;
  health_status: HealthStatus;
  data_source: DataSource;
}

export interface Venue {
  id: string;
  conference_id: string;
  venue_code: string;
  venue_name: string;
  category: Category;
  location: string;
  coordinator_id: string | null;
  created_at: string;
}

/** A venue joined with its coordinator and its (single) meeting. */
export interface VenueOverview extends Venue {
  coordinator: Coordinator | null;
  meeting: Meeting | null;
}
