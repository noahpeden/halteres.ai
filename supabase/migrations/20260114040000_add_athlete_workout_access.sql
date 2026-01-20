-- =============================================
-- ADD RLS POLICY FOR ATHLETES TO VIEW WORKOUTS
-- =============================================
-- The existing program_workouts RLS policies only allow coaches
-- (entity owners) to view workouts. Athletes need to be able to
-- view workouts for their gym.
-- =============================================

-- Add policy for gym members to view workouts in their gym
CREATE POLICY "Gym members can view gym workouts"
ON public.program_workouts
FOR SELECT
TO authenticated
USING (
    gym_id IS NOT NULL AND
    gym_id IN (
        SELECT gym_id FROM public.gym_memberships
        WHERE user_id = auth.uid()
        AND status = 'active'
    )
);

-- Also add policy for gym owners to view all workouts in their gym
CREATE POLICY "Gym owners can view all gym workouts"
ON public.program_workouts
FOR SELECT
TO authenticated
USING (
    gym_id IS NOT NULL AND
    gym_id IN (
        SELECT id FROM public.gyms
        WHERE owner_id = auth.uid()
    )
);
