-- Per-meeting attendance aggregates. security_invoker = true means the caller's RLS applies,
-- so coordinators only see their own venue's row. Aggregating in SQL avoids PostgREST's 1000-row cap.
create view public.attendance_summary with (security_invoker = true) as
select
  m.id as meeting_id, v.id as venue_id, v.venue_code, v.venue_name, v.category, v.location,
  m.meeting_title, m.meeting_status, m.start_time, m.end_time, m.actual_start_time, m.actual_end_time,
  m.expected_participants, m.current_participants, m.data_source,
  coalesce(a.attendees, 0) as total_attendees,
  a.avg_duration_seconds,
  c.first_joined as coordinator_first_joined,
  coalesce(c.total_seconds, 0) as coordinator_seconds,
  coalesce(c.sessions, 0) as coordinator_sessions
from public.meetings m
join public.venues v on v.id = m.venue_id
left join lateral (
  select count(*) filter (where not p.is_coordinator) as attendees,
         (avg(extract(epoch from coalesce(p.left_at, now()) - p.joined_at)) filter (where not p.is_coordinator))::int as avg_duration_seconds
  from public.meeting_participants p where p.meeting_id = m.id
) a on true
left join lateral (
  select min(p.joined_at) as first_joined,
         sum(extract(epoch from coalesce(p.left_at, now()) - p.joined_at))::int as total_seconds,
         count(*) as sessions
  from public.meeting_participants p where p.meeting_id = m.id and p.is_coordinator
) c on true;

grant select on public.attendance_summary to authenticated;
revoke all on public.attendance_summary from anon;
