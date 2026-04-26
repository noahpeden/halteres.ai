-- Phase 6: timezone reminders, PR tracking, batch API, integrations, coach mode

-- ─────────────────────────────────────────────────────────────────────
-- 1. Timezone-aware reminders
-- ─────────────────────────────────────────────────────────────────────
alter table profiles add column reminder_hour int not null default 7
  check (reminder_hour between 0 and 23);

-- Targets the hourly reminder cron should notify: users whose current hour
-- (in their tz) equals their reminder_hour and who have notifications on.
-- Returns user_id + local_date so the cron can match against today's workouts.
create or replace function reminder_targets() returns table (
  user_id uuid,
  local_date date
) language sql stable security definer as $$
  select
    p.user_id,
    (now() at time zone p.timezone)::date as local_date
  from profiles p
  where p.notifications_enabled = true
    and date_part('hour', now() at time zone p.timezone)::int = p.reminder_hour;
$$;

grant execute on function reminder_targets() to service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 2. PR tracking — view aggregating from workout_logs.exercises
--    Each row in exercises is { name, sets, reps, weight, rpe? }
-- ─────────────────────────────────────────────────────────────────────
create or replace view personal_records as
select
  wl.user_id,
  lower(trim(ex->>'name')) as exercise,
  max((ex->>'weight')::numeric) as max_weight,
  count(distinct wl.workout_id) as sessions,
  max(wl.completed_at) as last_at
from workout_logs wl,
     jsonb_array_elements(wl.exercises) ex
where (ex->>'weight') ~ '^[0-9]+(\.[0-9]+)?$'
  and (ex->>'name') is not null
group by 1, 2;

grant select on personal_records to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Batch API — generation tracking
-- ─────────────────────────────────────────────────────────────────────
alter table programs add column batch_id text;
alter table programs add column batch_status text
  check (batch_status in ('pending', 'in_progress', 'ended', 'failed'));
create index programs_batch_idx on programs (batch_status) where batch_status = 'in_progress';

-- ─────────────────────────────────────────────────────────────────────
-- 4. Third-party integrations (Strava, etc.)
-- ─────────────────────────────────────────────────────────────────────
create table integrations (
  user_id uuid not null references auth.users on delete cascade,
  provider text not null check (provider in ('strava', 'apple_health')),
  external_id text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
create trigger integrations_updated_at before update on integrations
  for each row execute function set_updated_at();

alter table integrations enable row level security;
create policy integrations_self on integrations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- 5. Coach mode
-- ─────────────────────────────────────────────────────────────────────
create table coach_relationships (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references auth.users on delete cascade,
  coach_id uuid not null references auth.users on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  unique (athlete_id, coach_id)
);
create index coach_rel_coach_idx on coach_relationships (coach_id) where status = 'active';
create index coach_rel_athlete_idx on coach_relationships (athlete_id) where status = 'active';

alter table coach_relationships enable row level security;
create policy coach_rel_self_read on coach_relationships for select
  using (athlete_id = auth.uid() or coach_id = auth.uid());
create policy coach_rel_athlete_manage on coach_relationships for all
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

create table coach_invites (
  token text primary key,
  athlete_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references auth.users,
  created_at timestamptz not null default now()
);
create index coach_invites_athlete_idx on coach_invites (athlete_id);

alter table coach_invites enable row level security;
create policy coach_invites_self on coach_invites for all
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- Helper: is `viewer` a coach of `target`?
create or replace function is_coach_of(target uuid, viewer uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from coach_relationships
    where athlete_id = target and coach_id = viewer and status = 'active'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Extend RLS so coaches get SELECT on their athletes' rows
--    Existing FOR ALL policies must be split (FOR SELECT + FOR ALL writes).
-- ─────────────────────────────────────────────────────────────────────
drop policy if exists profiles_self on profiles;
create policy profiles_self_write on profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_coach_read on profiles for select
  using (user_id = auth.uid() or is_coach_of(user_id, auth.uid()));

drop policy if exists programs_self on programs;
create policy programs_self_write on programs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy programs_coach_read on programs for select
  using (user_id = auth.uid() or is_coach_of(user_id, auth.uid()));

drop policy if exists workouts_self on workouts;
create policy workouts_self_write on workouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workouts_coach_read on workouts for select
  using (user_id = auth.uid() or is_coach_of(user_id, auth.uid()));

drop policy if exists workout_logs_self on workout_logs;
create policy workout_logs_self_write on workout_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_logs_coach_read on workout_logs for select
  using (user_id = auth.uid() or is_coach_of(user_id, auth.uid()));
