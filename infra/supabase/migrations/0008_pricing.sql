-- Phase 8 — pricing: annual plan, coach tier, marketplace take-rate

-- ─────────────────────────────────────────────────────────────────────
-- Subscriptions: extend tier to include `coach`, add cadence, support a
-- coach's seat capacity (max athletes they can have under their plan).
-- ─────────────────────────────────────────────────────────────────────
alter table subscriptions drop constraint subscriptions_tier_check;
alter table subscriptions add constraint subscriptions_tier_check
  check (tier in ('free', 'pro', 'coach'));

alter table subscriptions add column cadence text not null default 'monthly'
  check (cadence in ('monthly', 'annual', 'one_time'));

alter table subscriptions add column seats int not null default 0;

-- Coach plan limit: refresh entitlement_status with seat usage
drop view if exists entitlement_status;
create or replace view entitlement_status as
select
  s.user_id,
  s.tier,
  s.cadence,
  s.seats,
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
  ) as programs_this_month,
  coalesce(
    (select count(*)::int from coach_relationships cr
       where cr.coach_id = s.user_id and cr.status = 'active'),
    0
  ) as coached_athletes
from subscriptions s;

grant select on entitlement_status to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Marketplace take-rate: paid templates with Stripe Connect payouts.
-- Authors connect a Stripe account; we hold a percentage on each fork sale.
-- ─────────────────────────────────────────────────────────────────────
alter table programs add column price_cents int not null default 0
  check (price_cents = 0 or price_cents >= 99);
alter table programs add column currency text not null default 'usd';

create table connect_accounts (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_account_id text unique not null,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger connect_accounts_updated_at before update on connect_accounts
  for each row execute function set_updated_at();

alter table connect_accounts enable row level security;
create policy connect_accounts_self on connect_accounts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table template_purchases (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references auth.users on delete cascade,
  template_id uuid not null references programs on delete cascade,
  author_id uuid not null references auth.users,
  forked_program_id uuid references programs on delete set null,
  amount_cents int not null,
  application_fee_cents int not null,    -- our take
  stripe_payment_intent text unique,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);
create index template_purchases_author_idx on template_purchases (author_id, created_at desc);
create index template_purchases_buyer_idx on template_purchases (buyer_id);

alter table template_purchases enable row level security;
-- Buyer can read own purchases; author can read sales on their templates.
create policy template_purchases_buyer_read on template_purchases for select
  using (buyer_id = auth.uid());
create policy template_purchases_author_read on template_purchases for select
  using (author_id = auth.uid());
-- Writes via service role only (Stripe webhook).

-- Author earnings rollup
create or replace view template_earnings as
select
  author_id as user_id,
  count(*) filter (where status = 'succeeded') as sales,
  sum(amount_cents) filter (where status = 'succeeded') as gross_cents,
  sum(amount_cents - application_fee_cents) filter (where status = 'succeeded') as author_cents,
  sum(application_fee_cents) filter (where status = 'succeeded') as platform_cents
from template_purchases
group by author_id;
grant select on template_earnings to authenticated;
