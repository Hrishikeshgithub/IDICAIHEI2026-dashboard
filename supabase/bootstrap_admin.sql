-- Run once in the Supabase SQL editor AFTER creating your admin user under
-- Authentication > Users (email + password). Replace the email below.
insert into public.profiles (id, email, full_name, role)
select id, email, 'Super Admin', 'super_admin'
from auth.users
where email = 'YOUR_ADMIN_EMAIL@example.com'
on conflict (id) do update set role = 'super_admin';
