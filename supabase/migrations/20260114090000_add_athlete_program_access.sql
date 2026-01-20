-- Allow gym members to view programs at their gym
CREATE POLICY "Gym members can view gym programs"
ON public.programs
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

-- Allow gym owners to view all programs in their gyms
CREATE POLICY "Gym owners can view all gym programs"
ON public.programs
FOR SELECT
TO authenticated
USING (
    gym_id IS NOT NULL AND
    gym_id IN (
        SELECT id FROM public.gyms
        WHERE owner_id = auth.uid()
    )
);
