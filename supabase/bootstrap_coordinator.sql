-- Gives a venue coordinator their own login. Coordinators are limited by Row Level Security to the
-- venue they are assigned to; they cannot edit anything.
--
-- 1. Supabase dashboard > Authentication > Users > Add user (email + a strong password, auto-confirm).
-- 2. Make sure the person exists under Coordinators in the dashboard and is assigned to a venue.
-- 3. Replace the two emails below and run this in the SQL editor.
insert into public.profiles (id, email, full_name, role, coordinator_id)
select u.id, u.email, c.full_name, 'coordinator', c.id
from auth.users u
join public.coordinators c on lower(c.email) = lower(u.email)
where lower(u.email) = lower('COORDINATOR_LOGIN_EMAIL@example.com')
on conflict (id) do update set role = 'coordinator', coordinator_id = excluded.coordinator_id;
-- NOTE: the login email must equal the coordinator record's email (that is how the two are linked).
