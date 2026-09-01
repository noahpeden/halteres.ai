-- Additive person-level athlete file for B2C self-coached athletes.
-- Units in the JSON are pounds. Do not use Clerk user_... ids as PKs.
-- Existing profiles RLS already lets an athlete read/write only their own row
-- (auth.uid() = id). This column inherits those policies.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS athlete_file jsonb;

COMMENT ON COLUMN public.profiles.athlete_file IS
  'B2C athlete file: squat_lb, bench_lb, deadlift_lb, bodyweight_lb, days_per_week, session_minutes, injuries. Person-level, not program-level.';
