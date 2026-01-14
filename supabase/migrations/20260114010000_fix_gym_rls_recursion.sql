-- Fix infinite recursion in gym RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Members can view their gyms" ON public.gyms;
DROP POLICY IF EXISTS "Gym owners can manage memberships" ON public.gym_memberships;
DROP POLICY IF EXISTS "Gym owners can view all memberships" ON public.gym_memberships;

-- Recreate gym_memberships policies without referencing gyms table
-- Use a security definer function to check gym ownership
CREATE OR REPLACE FUNCTION public.is_gym_owner(gym_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gyms
    WHERE id = gym_uuid AND owner_id = auth.uid()
  );
$$;

-- Gym owners can manage memberships (using function)
CREATE POLICY "Gym owners can manage memberships" ON public.gym_memberships
  FOR ALL
  USING (public.is_gym_owner(gym_id))
  WITH CHECK (public.is_gym_owner(gym_id));

-- Recreate gyms policy for members without referencing gym_memberships directly
-- Use a security definer function
CREATE OR REPLACE FUNCTION public.is_gym_member(gym_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gym_memberships
    WHERE gym_id = gym_uuid
    AND user_id = auth.uid()
    AND status = 'active'
  );
$$;

-- Members can view their gyms (using function)
CREATE POLICY "Members can view their gyms" ON public.gyms
  FOR SELECT
  USING (public.is_gym_member(id) OR owner_id = auth.uid() OR (invite_code IS NOT NULL AND deleted_at IS NULL));
