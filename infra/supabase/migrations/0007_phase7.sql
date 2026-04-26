-- Phase 7: coach annotations, streak tracking, calendar feed, templates marketplace

-- ─────────────────────────────────────────────────────────────────────
-- 1. Coach annotations: notes a coach leaves on an athlete's workout
-- ─────────────────────────────────────────────────────────────────────
create table coach_notes (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid not null references workouts on delete cascade,
  coach_id uuid not null references auth.users on delete cascade,
  athlete_id uuid not null references auth.users on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coach_notes_workout_idx on coach_notes (workout_id, created_at desc);

create trigger coach_notes_updated_at before update on coach_notes
  for each row execute function set_updated_at();

alter table coach_notes enable row level security;

-- Coach can manage their own notes
create policy coach_notes_coach_manage on coach_notes for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Athlete can read notes left on their workouts
create policy coach_notes_athlete_read on coach_notes for select
  using (athlete_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- 2. Streak tracking: SQL fn returns current + longest consecutive days logged
-- ─────────────────────────────────────────────────────────────────────
create or replace function my_streak() returns json
language plpgsql stable security definer as $$
declare
  longest int := 0;
  run int := 0;
  prev date;
  curr date;
  uid uuid := auth.uid();
begin
  for curr in
    select distinct completed_at::date
    from workout_logs
    where user_id = uid
    order by 1
  loop
    if prev is null or curr - prev = 1 then
      run := run + 1;
    else
      if run > longest then longest := run; end if;
      run := 1;
    end if;
    prev := curr;
  end loop;
  if run > longest then longest := run; end if;

  return json_build_object(
    'current', case when prev >= current_date - interval '1 day' then run else 0 end,
    'longest', longest,
    'last_logged_at', prev
  );
end;
$$;
grant execute on function my_streak() to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Templates marketplace
-- ─────────────────────────────────────────────────────────────────────
alter table programs add column is_template boolean not null default false;
alter table programs add column fork_count int not null default 0;
alter table programs add column forked_from uuid references programs on delete set null;

create index programs_template_idx on programs (is_template, fork_count desc) where is_template = true;

-- Public templates are readable by anyone
create or replace view public_templates as
select
  id, title, description, methodology, periodization,
  duration_weeks, days_per_week, fork_count, created_at
from programs
where is_template = true;

create or replace view public_template_workouts as
select
  w.id, w.program_id, w.week_number, w.day_index, w.title, w.body_skeleton, w.body_detailed
from workouts w
join programs p on p.id = w.program_id
where p.is_template = true;

grant select on public_templates to anon, authenticated;
grant select on public_template_workouts to anon, authenticated;

create or replace function increment_fork_count(template_id uuid) returns void
language sql security definer as $$
  update programs set fork_count = fork_count + 1
  where id = template_id and is_template = true;
$$;
grant execute on function increment_fork_count(uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────
-- 4. PR auto-fill helper: top weight per exercise for the current user
--    (already in 0006 personal_records view; this fn returns it as a map)
-- ─────────────────────────────────────────────────────────────────────
create or replace function my_prs_for(exercises text[]) returns table (
  exercise text, max_weight numeric
) language sql stable security definer as $$
  select
    pr.exercise,
    pr.max_weight
  from personal_records pr
  where pr.user_id = auth.uid()
    and pr.exercise = any (
      select lower(trim(unnest(exercises)))
    );
$$;
grant execute on function my_prs_for(text[]) to authenticated;
