-- Lets the signed-in Super Admin write audit entries for their own actions
-- (so the prototype needs no service-role key for audit logging).
create policy audit_admin_insert on public.audit_logs for insert to authenticated
  with check (public.is_super_admin() and user_id = (select auth.uid()));
