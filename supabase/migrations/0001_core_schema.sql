-- Phase 1: core schema for the conference operations dashboard.
-- Every row that the simulation service writes carries data_source = 'simulated'
-- so it can never be mistaken for real provider (Teams) data.

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type public.conference_category as enum ('medical_healthcare', 'education', 'industry');
create type public.meeting_status as enum ('scheduled', 'starting', 'live', 'waiting', 'ended', 'technical_issue');
create type public.app_role as enum ('super_admin', 'coordinator');
create type public.account_status as enum ('active', 'inactive', 'invited');
create type public.data_source as enum ('simulated', 'provider');
create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.health_status as enum ('good', 'degraded', 'poor', 'unknown');

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- tables ----------
create table public.conferences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  conference_date date,
  start_date date not null,
  end_date date not null,
  status text not null default 'planned' check (status in ('planned','active','completed','cancelled')),
  demo_mode boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.coordinators (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  account_status public.account_status not null default 'active',
  is_connected boolean not null default false,
  last_seen_at timestamptz,
  data_source public.data_source not null default 'simulated',
  created_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  conference_id uuid not null references public.conferences(id) on delete cascade,
  venue_code text not null,
  venue_name text not null check (char_length(venue_name) between 2 and 160),
  category public.conference_category not null,
  location text not null,
  coordinator_id uuid unique references public.coordinators(id) on delete set null, -- one coordinator per venue
  created_at timestamptz not null default now(),
  unique (conference_id, venue_code)
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  meeting_title text not null,
  meeting_provider text not null default 'mock' check (meeting_provider in ('mock','microsoft_teams')),
  external_meeting_id text,
  join_url text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  meeting_status public.meeting_status not null default 'scheduled',
  expected_participants integer not null default 0 check (expected_participants >= 0),
  current_participants integer not null default 0 check (current_participants >= 0),
  coordinator_present boolean not null default false,
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  last_activity_at timestamptz,
  health_status public.health_status not null default 'unknown',
  data_source public.data_source not null default 'simulated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create trigger meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

create table public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  participant_name text not null,
  participant_email text,
  is_coordinator boolean not null default false,
  joined_at timestamptz not null,
  left_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  data_source public.data_source not null default 'simulated',
  created_at timestamptz not null default now(),
  check (left_at is null or left_at >= joined_at)
);

create table public.meeting_events (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  event_type text not null check (event_type in (
    'meeting_started','coordinator_joined','coordinator_left','participant_joined',
    'participant_left','meeting_ended','technical_issue','status_changed')),
  event_description text not null,
  event_timestamp timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  data_source public.data_source not null default 'simulated',
  external_event_id text -- provider event id, used for duplicate-event protection later
);
create unique index meeting_events_dedupe on public.meeting_events (meeting_id, external_event_id)
  where external_event_id is not null;

create table public.meeting_technical_metrics (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  metric_type text not null check (metric_type in (
    'connection_quality','latency_ms','packet_loss_pct','audio_quality','video_quality')),
  metric_value numeric not null,
  recorded_at timestamptz not null default now(),
  data_source public.data_source not null default 'simulated'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete cascade,
  meeting_id uuid references public.meetings(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'not_started_on_time','coordinator_absent','ended_unexpectedly',
    'participant_drop','technical_issue','delayed')),
  message text not null,
  severity public.alert_severity not null default 'warning',
  is_read boolean not null default false,
  data_source public.data_source not null default 'simulated',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role public.app_role not null default 'coordinator',
  coordinator_id uuid unique references public.coordinators(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- indexes (foreign keys + common filters) ----------
create index on public.venues (conference_id);
create index on public.venues (category);
create index on public.meetings (venue_id);
create index on public.meetings (meeting_status);
create index on public.meetings (start_time);
create index on public.meeting_participants (meeting_id, joined_at desc);
create index on public.meeting_events (meeting_id, event_timestamp desc);
create index on public.meeting_technical_metrics (meeting_id, recorded_at desc);
create index on public.notifications (venue_id, created_at desc);
create index on public.notifications (meeting_id);
create index on public.notifications (is_read) where is_read = false;
create index on public.audit_logs (created_at desc);
create index on public.audit_logs (user_id);
create index on public.profiles (coordinator_id);

-- ---------- RLS helper functions ----------
-- SECURITY DEFINER so policies can read profiles without recursion.
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'super_admin');
$$;

create or replace function public.my_coordinator_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.coordinator_id from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.my_venue_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select v.id from public.venues v where v.coordinator_id = public.my_coordinator_id();
$$;

create or replace function public.can_view_meeting(m_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_super_admin() or exists (
    select 1 from public.meetings m where m.id = m_id and m.venue_id = public.my_venue_id());
$$;

revoke execute on function public.is_super_admin(), public.my_coordinator_id(),
  public.my_venue_id(), public.can_view_meeting(uuid) from public, anon;
grant execute on function public.is_super_admin(), public.my_coordinator_id(),
  public.my_venue_id(), public.can_view_meeting(uuid) to authenticated;

-- ---------- enable RLS ----------
alter table public.conferences enable row level security;
alter table public.coordinators enable row level security;
alter table public.venues enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_events enable row level security;
alter table public.meeting_technical_metrics enable row level security;
alter table public.notifications enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

-- ---------- policies ----------
-- conferences: any signed-in user reads; only admin writes
create policy conferences_read on public.conferences for select to authenticated using (true);
create policy conferences_admin_write on public.conferences for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- coordinators: admin full; a coordinator sees only their own record
create policy coordinators_admin_all on public.coordinators for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy coordinators_self_read on public.coordinators for select to authenticated
  using (id = public.my_coordinator_id());

-- venues: admin full; coordinator reads only own venue
create policy venues_admin_all on public.venues for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy venues_coordinator_read on public.venues for select to authenticated
  using (id = public.my_venue_id());

-- meetings
create policy meetings_admin_all on public.meetings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy meetings_coordinator_read on public.meetings for select to authenticated
  using (venue_id = public.my_venue_id());

-- child tables: admin full; coordinator read-only for own venue's meetings
create policy participants_admin_all on public.meeting_participants for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy participants_coordinator_read on public.meeting_participants for select to authenticated
  using (public.can_view_meeting(meeting_id));

create policy events_admin_all on public.meeting_events for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy events_coordinator_read on public.meeting_events for select to authenticated
  using (public.can_view_meeting(meeting_id));

create policy metrics_admin_all on public.meeting_technical_metrics for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy metrics_coordinator_read on public.meeting_technical_metrics for select to authenticated
  using (public.can_view_meeting(meeting_id));

create policy notifications_admin_all on public.notifications for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
create policy notifications_coordinator_read on public.notifications for select to authenticated
  using (venue_id = public.my_venue_id());

-- profiles: users read their own; admin manages all. Role changes are admin-only.
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- audit logs: admin read-only; writes happen server-side via the service role
create policy audit_admin_read on public.audit_logs for select to authenticated
  using (public.is_super_admin());

-- ---------- realtime ----------
alter publication supabase_realtime add table public.meetings, public.meeting_events, public.notifications, public.coordinators;
