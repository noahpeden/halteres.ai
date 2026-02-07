-- Backfill workouts missing gym_id from their parent program
-- This is needed because the RLS policy requires gym_id for athlete access:
-- gym_id IS NOT NULL AND gym_id IN (SELECT gym_id FROM gym_memberships WHERE user_id = auth.uid())

UPDATE public.program_workouts pw
SET gym_id = p.gym_id
FROM public.programs p
WHERE pw.program_id = p.id
  AND pw.gym_id IS NULL
  AND p.gym_id IS NOT NULL;

-- Also backfill week_number if missing (based on order within program)
-- Uses a default of 3 workouts per week to calculate week number
WITH ranked_workouts AS (
  SELECT
    pw.id,
    pw.program_id,
    CEIL(ROW_NUMBER() OVER (
      PARTITION BY pw.program_id
      ORDER BY COALESCE(pw.scheduled_date, pw.created_at)
    )::DECIMAL / 3)::INT as calculated_week
  FROM public.program_workouts pw
  WHERE pw.week_number IS NULL
)
UPDATE public.program_workouts pw
SET week_number = rw.calculated_week
FROM ranked_workouts rw
WHERE pw.id = rw.id;
