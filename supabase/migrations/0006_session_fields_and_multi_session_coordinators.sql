-- Conference sessions (from the programme schedule): mode, floor, subtrack, chairs, day, paper schedule.
-- A coordinator (rapporteur) may run several sessions, e.g. the same hall on both days, so the
-- one-venue-per-coordinator constraint is dropped and RLS helpers become set-returning.
alter table public.venues drop constraint if exists venues_coordinator_id_key;
create index if not exists venues_coordinator_idx on public.venues (coordinator_id);

alter table public.venues
  add column if not exists mode text not null default 'offline' check (mode in ('offline','online')),
  add column if not exists floor text,
  add column if not exists subtrack text,
  add column if not exists session_chairs text,
  add column if not exists day_number smallint not null default 1 check (day_number between 1 and 5);

alter table public.meetings
  add column if not exists schedule jsonb not null default '[]'::jsonb;

create or replace function public.my_venue_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select v.id from public.venues v where v.coordinator_id = public.my_coordinator_id();
$$;
revoke execute on function public.my_venue_ids() from public, anon;
grant execute on function public.my_venue_ids() to authenticated;

drop policy if exists venues_coordinator_read on public.venues;
create policy venues_coordinator_read on public.venues for select to authenticated
  using (id in (select public.my_venue_ids()));

drop policy if exists meetings_coordinator_read on public.meetings;
create policy meetings_coordinator_read on public.meetings for select to authenticated
  using (venue_id in (select public.my_venue_ids()));

drop policy if exists notifications_coordinator_read on public.notifications;
create policy notifications_coordinator_read on public.notifications for select to authenticated
  using (venue_id in (select public.my_venue_ids()));

create or replace function public.can_view_meeting(m_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_super_admin() or exists (
    select 1 from public.meetings m where m.id = m_id and m.venue_id in (select public.my_venue_ids()));
$$;

drop function public.my_venue_id();
