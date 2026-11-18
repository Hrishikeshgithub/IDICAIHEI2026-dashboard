-- Phase 5: infrastructure for the future Microsoft Teams provider.
-- Webhooks only enqueue into provider_events; a separate job processes them (fast 2xx to Graph,
-- retries, and duplicate protection via unique (provider, external_event_id)).
create table public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('microsoft_teams')),
  external_event_id text not null,
  event_kind text not null check (event_kind in ('change','lifecycle')),
  subscription_id text,
  resource text,
  change_type text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  unique (provider, external_event_id)
);
create index provider_events_pending_idx on public.provider_events (received_at) where processed_at is null;

create table public.provider_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  level text not null check (level in ('info','warn','error')),
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index provider_logs_created_idx on public.provider_logs (created_at desc);

create table public.integration_subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('microsoft_teams')),
  subscription_id text not null unique,
  resource text not null,
  change_type text not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','removed','error')),
  last_renewed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index integration_subscriptions_expiry_idx on public.integration_subscriptions (expires_at) where status = 'active';

-- Writes come only from the server using the service role (which bypasses RLS). Admins may read.
alter table public.provider_events enable row level security;
alter table public.provider_logs enable row level security;
alter table public.integration_subscriptions enable row level security;

create policy provider_events_admin_read on public.provider_events for select to authenticated using (public.is_super_admin());
create policy provider_logs_admin_read on public.provider_logs for select to authenticated using (public.is_super_admin());
create policy integration_subs_admin_read on public.integration_subscriptions for select to authenticated using (public.is_super_admin());
