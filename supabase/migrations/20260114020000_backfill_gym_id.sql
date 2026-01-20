-- =============================================
-- BACKFILL GYM_ID FOR PROGRAMS AND WORKOUTS
-- =============================================
-- This migration backfills gym_id for existing programs and workouts
-- that were created before the gym system was implemented.
-- =============================================

-- Step 1: Backfill programs with gym_id from entity owner's gym membership
-- Programs link to entities, entities have user_id (the coach)
UPDATE public.programs p
SET gym_id = gm.gym_id
FROM public.entities e, public.gym_memberships gm
WHERE p.gym_id IS NULL
  AND p.entity_id = e.id
  AND e.user_id = gm.user_id
  AND gm.role IN ('owner', 'coach')
  AND gm.status = 'active';

-- Step 2: Backfill program_workouts with gym_id from their parent program
UPDATE public.program_workouts pw
SET gym_id = p.gym_id
FROM public.programs p
WHERE pw.program_id = p.id
  AND pw.gym_id IS NULL
  AND p.gym_id IS NOT NULL;

-- Log how many records were updated
DO $$
DECLARE
    programs_updated INT;
    workouts_updated INT;
BEGIN
    -- Count programs with gym_id now set
    SELECT COUNT(*) INTO programs_updated
    FROM public.programs
    WHERE gym_id IS NOT NULL;

    -- Count workouts with gym_id now set
    SELECT COUNT(*) INTO workouts_updated
    FROM public.program_workouts
    WHERE gym_id IS NOT NULL;

    RAISE NOTICE 'Backfill complete: % programs and % workouts now have gym_id set',
        programs_updated, workouts_updated;
END $$;
