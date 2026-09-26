-- Phase 0 + Phase 1: one History row per athlete per program workout,
-- plus optional lift-log JSON on Complete.
--
-- Apply on project vrmuakouskjbabedjhoc before merge if the column / unique
-- are not already present. Do not invent a normalized sets table yet.
-- Phase 2 (next-day load nudge) and Phase 3 (block rollup) should read
-- workout_results.exercise_logs.

ALTER TABLE public.workout_results
ADD COLUMN IF NOT EXISTS exercise_logs jsonb;

COMMENT ON COLUMN public.workout_results.exercise_logs IS
  'Phase 1 lift log (schema_version 1): { unit, skipped, session_notes, session_rpe, exercises: [{ name, section, prescribed, sets, rpe, notes }] }. Phase 2/3 should read this blob.';

-- Keep the newest live row when History was double-inserted.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, workout_id
      ORDER BY (deleted_at IS NULL) DESC, created_at DESC, updated_at DESC
    ) AS rn
  FROM public.workout_results
)
DELETE FROM public.workout_results wr
USING ranked
WHERE wr.id = ranked.id
  AND ranked.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workout_results_user_id_workout_id_key'
      AND conrelid = 'public.workout_results'::regclass
  ) THEN
    ALTER TABLE public.workout_results
      ADD CONSTRAINT workout_results_user_id_workout_id_key
      UNIQUE (user_id, workout_id);
  END IF;
END $$;
