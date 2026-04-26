-- Halteres Pro — initial schema
-- Postgres 15+, pgvector required

create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ─────────────────────────────────────────────────────────────────────
-- profiles: per-user training context (not auth fields — those live in auth.users)
-- ─────────────────────────────────────────────────────────────────────
create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  units text not null default 'imperial' check (units in ('imperial', 'metric')),
  gender text,
  dob date,
  timezone text default 'UTC',
  goals text,
  injury_history jsonb not null default '{}'::jsonb,
  equipment_access text[] not null default '{}',
  preferred_methodologies text[] not null default '{}',
  max_lifts jsonb not null default '{}'::jsonb,
  conditioning_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- programs: 1–8 week training plans
-- ─────────────────────────────────────────────────────────────────────
create table programs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  methodology text,
  periodization text not null default 'linear'
    check (periodization in ('linear', 'block', 'undulating', 'conjugate')),
  duration_weeks int not null check (duration_weeks between 1 and 8),
  days_per_week int not null check (days_per_week between 1 and 7),
  start_date date not null,
  generation_status text not null default 'pending'
    check (generation_status in ('pending', 'skeleton', 'detailed', 'archived', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index programs_user_id_idx on programs (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- workouts: skeleton-first, enhance on demand
-- ─────────────────────────────────────────────────────────────────────
create table workouts (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references programs on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  week_number int not null check (week_number between 1 and 8),
  day_index int not null check (day_index between 0 and 6),
  scheduled_date date not null,
  title text not null,
  body_skeleton text,
  body_detailed text,
  enhancement_input text,
  enhanced_at timestamptz,
  generation_status text not null default 'skeleton'
    check (generation_status in ('skeleton', 'enhancing', 'detailed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workouts_program_idx on workouts (program_id, week_number, day_index);
create index workouts_user_scheduled_idx on workouts (user_id, scheduled_date);
create index workouts_status_idx on workouts (generation_status) where generation_status != 'detailed';

-- ─────────────────────────────────────────────────────────────────────
-- workout_logs: feedback loop. This is the moat.
-- ─────────────────────────────────────────────────────────────────────
create table workout_logs (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid not null references workouts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  completed_at timestamptz not null default now(),
  duration_minutes int,
  rpe int check (rpe between 1 and 10),
  thumbs text check (thumbs in ('up', 'down')),
  notes text,
  substitutions jsonb not null default '[]'::jsonb,
  skipped_sections text[] not null default '{}',
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create unique index workout_logs_one_per_workout on workout_logs (workout_id);
create index workout_logs_user_completed_idx on workout_logs (user_id, completed_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- workout_embeddings: pgvector index for RAG
-- ─────────────────────────────────────────────────────────────────────
create table workout_embeddings (
  workout_id uuid primary key references workouts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  embedding vector(1024) not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- HNSW index. Filter by user_id BEFORE the ANN search (much faster, prevents leakage).
create index workout_embeddings_user_idx on workout_embeddings (user_id);
create index workout_embeddings_hnsw on workout_embeddings
  using hnsw (embedding vector_cosine_ops);

-- ─────────────────────────────────────────────────────────────────────
-- generation_runs: cost + audit tracking from day 1
-- ─────────────────────────────────────────────────────────────────────
create table generation_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  program_id uuid references programs on delete set null,
  workout_id uuid references workouts on delete set null,
  kind text not null check (kind in ('skeleton', 'enhance', 'embed')),
  model text not null,
  input_tokens int,
  output_tokens int,
  cached_tokens int,
  cost_usd numeric(10,6),
  duration_ms int,
  error text,
  created_at timestamptz not null default now()
);

create index generation_runs_user_idx on generation_runs (user_id, created_at desc);
create index generation_runs_program_idx on generation_runs (program_id);

-- ─────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger programs_updated_at before update on programs
  for each row execute function set_updated_at();
create trigger workouts_updated_at before update on workouts
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- Row-level security: every table scoped to auth.uid()
-- ─────────────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table programs enable row level security;
alter table workouts enable row level security;
alter table workout_logs enable row level security;
alter table workout_embeddings enable row level security;
alter table generation_runs enable row level security;

create policy profiles_self on profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy programs_self on programs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy workouts_self on workouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy workout_logs_self on workout_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy workout_embeddings_self on workout_embeddings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- generation_runs: read-only to users, writes via service role
create policy generation_runs_self_read on generation_runs for select
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- match_workouts: RAG retrieval RPC. Pre-filters by user, then ANN.
-- Called via supabase.rpc('match_workouts', ...) with a service-role client.
-- ─────────────────────────────────────────────────────────────────────
create or replace function match_workouts(
  query_embedding vector(1024),
  target_user_id uuid,
  match_count int default 8,
  min_similarity float default 0.5
) returns table (
  workout_id uuid,
  similarity float,
  summary text,
  metadata jsonb,
  log jsonb
) language sql stable as $$
  select
    we.workout_id,
    1 - (we.embedding <=> query_embedding) as similarity,
    we.summary,
    we.metadata,
    to_jsonb(wl) - 'id' - 'workout_id' - 'user_id' as log
  from workout_embeddings we
  left join workout_logs wl on wl.workout_id = we.workout_id
  where we.user_id = target_user_id
    and 1 - (we.embedding <=> query_embedding) > min_similarity
  order by we.embedding <=> query_embedding
  limit match_count;
$$;
