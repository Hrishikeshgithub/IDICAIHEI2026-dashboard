-- duration_seconds is derived from joined_at/left_at so every writer (simulator, future Teams sync) stays consistent.
create or replace function public.set_participant_duration() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.left_at is not null then
    new.duration_seconds := greatest(0, extract(epoch from (new.left_at - new.joined_at)))::int;
  else
    new.duration_seconds := null;
  end if;
  return new;
end $$;

create trigger meeting_participants_duration
  before insert or update of joined_at, left_at on public.meeting_participants
  for each row execute function public.set_participant_duration();

create index if not exists meeting_participants_open_idx
  on public.meeting_participants (meeting_id) where left_at is null;
