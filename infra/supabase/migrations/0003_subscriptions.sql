-- Subscriptions: one source of truth for entitlement, fed by Stripe (web) and
-- RevenueCat (iOS/Android). The entitlement check reads `tier` and `expires_at`.

create table subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  source text not null default 'free' check (source in ('free', 'stripe', 'revenuecat')),
  external_id text, -- stripe customer id or revenuecat app_user_id
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index subscriptions_external_idx on subscriptions (source, external_id);

create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();

alter table subscriptions enable row level security;

create policy subscriptions_self_read on subscriptions for select
  using (user_id = auth.uid());
-- Writes only via service role (webhooks).

-- Auto-create a free row on signup so entitlement checks always have a row.
create or replace function provision_free_subscription() returns trigger as $$
begin
  insert into subscriptions (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function provision_free_subscription();

-- Entitlement view: collapses tier + monthly enhance count for fast lookup.
create or replace view entitlement_status as
select
  s.user_id,
  s.tier,
  s.current_period_end,
  s.cancel_at_period_end,
  coalesce(
    (select count(*)::int from generation_runs gr
       where gr.user_id = s.user_id
         and gr.kind = 'enhance'
         and gr.created_at > date_trunc('month', now())),
    0
  ) as enhances_this_month,
  coalesce(
    (select count(*)::int from programs p
       where p.user_id = s.user_id
         and p.created_at > date_trunc('month', now())),
    0
  ) as programs_this_month
from subscriptions s;

grant select on entitlement_status to authenticated;
