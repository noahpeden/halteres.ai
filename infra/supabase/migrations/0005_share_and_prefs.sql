-- Public share tokens for programs (read-only). Generated on demand, revocable.
alter table programs add column share_token text unique;

create index programs_share_token_idx on programs (share_token) where share_token is not null;

-- Notification preference: opt-out of workout reminders
alter table profiles add column notifications_enabled boolean not null default true;

-- Public read access for shared programs.
-- The view filters by share_token presence, so anon role can read only what's shared.
create or replace view public_programs as
select
  p.id,
  p.share_token,
  p.title,
  p.description,
  p.methodology,
  p.duration_weeks,
  p.days_per_week,
  p.created_at
from programs p
where p.share_token is not null;

create or replace view public_workouts as
select
  w.id,
  w.program_id,
  w.week_number,
  w.day_index,
  w.title,
  w.body_skeleton,
  w.body_detailed
from workouts w
join programs p on p.id = w.program_id
where p.share_token is not null;

grant select on public_programs to anon, authenticated;
grant select on public_workouts to anon, authenticated;
