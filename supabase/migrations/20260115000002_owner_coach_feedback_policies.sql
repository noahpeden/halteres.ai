-- =============================================
-- Allow Owners and Coaches to Give Feedback
-- =============================================

-- Drop existing restrictive policies for template feedback
DROP POLICY IF EXISTS "Users can manage own template feedback" ON public.workout_template_feedback;
DROP POLICY IF EXISTS "Gym members can view template feedback" ON public.workout_template_feedback;

-- Users can manage their own feedback (unchanged behavior)
CREATE POLICY "Users can manage own template feedback"
ON public.workout_template_feedback FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Owners and coaches can INSERT feedback for workouts in their gym
CREATE POLICY "Owners and coaches can give template feedback"
ON public.workout_template_feedback FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid()
        AND gm.gym_id = workout_template_feedback.gym_id
        AND gm.role IN ('owner', 'coach')
        AND gm.status = 'active'
    )
);

-- Owners and coaches can UPDATE their own feedback in their gym
CREATE POLICY "Owners and coaches can update own template feedback"
ON public.workout_template_feedback FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid()
        AND gm.gym_id = workout_template_feedback.gym_id
        AND gm.role IN ('owner', 'coach')
        AND gm.status = 'active'
    )
)
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid()
        AND gm.gym_id = workout_template_feedback.gym_id
        AND gm.role IN ('owner', 'coach')
        AND gm.status = 'active'
    )
);

-- Owners and coaches can DELETE their own feedback in their gym
CREATE POLICY "Owners and coaches can delete own template feedback"
ON public.workout_template_feedback FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid()
        AND gm.gym_id = workout_template_feedback.gym_id
        AND gm.role IN ('owner', 'coach')
        AND gm.status = 'active'
    )
);

-- All gym members can view template feedback for their gym's workouts
CREATE POLICY "Gym members can view template feedback"
ON public.workout_template_feedback FOR SELECT
TO authenticated
USING (
    gym_id IN (
        SELECT gm.gym_id FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid() AND gm.status = 'active'
    )
);

-- =============================================
-- Result Feedback - Owners and Coaches
-- =============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can manage own result feedback" ON public.workout_result_feedback;
DROP POLICY IF EXISTS "Gym owners can view all gym feedback" ON public.workout_result_feedback;

-- Users can manage feedback they've given
CREATE POLICY "Users can manage own result feedback"
ON public.workout_result_feedback FOR ALL
TO authenticated
USING (from_user_id = auth.uid())
WITH CHECK (from_user_id = auth.uid());

-- Owners and coaches can give feedback to athletes in their gym
CREATE POLICY "Owners and coaches can give result feedback to athletes"
ON public.workout_result_feedback FOR INSERT
TO authenticated
WITH CHECK (
    -- Must be an owner or coach in the gym
    EXISTS (
        SELECT 1 FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid()
        AND gm.gym_id = workout_result_feedback.gym_id
        AND gm.role IN ('owner', 'coach')
        AND gm.status = 'active'
    )
    -- The target user must also be in the same gym
    AND EXISTS (
        SELECT 1 FROM public.gym_memberships gm
        WHERE gm.user_id = workout_result_feedback.to_user_id
        AND gm.gym_id = workout_result_feedback.gym_id
        AND gm.status = 'active'
    )
);

-- Owners and coaches can view all feedback in their gym
CREATE POLICY "Owners and coaches can view gym feedback"
ON public.workout_result_feedback FOR SELECT
TO authenticated
USING (
    gym_id IN (
        SELECT gm.gym_id FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'coach')
        AND gm.status = 'active'
    )
);

-- Owners and coaches can update feedback they've given
CREATE POLICY "Owners and coaches can update own result feedback"
ON public.workout_result_feedback FOR UPDATE
TO authenticated
USING (
    from_user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid()
        AND gm.gym_id = workout_result_feedback.gym_id
        AND gm.role IN ('owner', 'coach')
        AND gm.status = 'active'
    )
)
WITH CHECK (
    from_user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid()
        AND gm.gym_id = workout_result_feedback.gym_id
        AND gm.role IN ('owner', 'coach')
        AND gm.status = 'active'
    )
);

-- Owners and coaches can delete feedback they've given
CREATE POLICY "Owners and coaches can delete own result feedback"
ON public.workout_result_feedback FOR DELETE
TO authenticated
USING (
    from_user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid()
        AND gm.gym_id = workout_result_feedback.gym_id
        AND gm.role IN ('owner', 'coach')
        AND gm.status = 'active'
    )
);
