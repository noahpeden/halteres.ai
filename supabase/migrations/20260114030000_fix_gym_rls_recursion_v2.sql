-- Fix infinite recursion in gym RLS policies more aggressively
-- The issue is that JOIN queries trigger RLS on both tables

-- Drop all existing policies on gyms and gym_memberships to start fresh
DROP POLICY IF EXISTS "Gym owners have full access" ON public.gyms;
DROP POLICY IF EXISTS "Members can view their gyms" ON public.gyms;
DROP POLICY IF EXISTS "Anyone can view gyms by invite code" ON public.gyms;
DROP POLICY IF EXISTS "Gym owners can manage memberships" ON public.gym_memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.gym_memberships;
DROP POLICY IF EXISTS "Users can request to join gyms" ON public.gym_memberships;
DROP POLICY IF EXISTS "Users can leave gyms" ON public.gym_memberships;

-- Create simple, non-recursive policies for gyms
-- Owners have full access
CREATE POLICY "gym_owner_full_access" ON public.gyms
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Anyone authenticated can view gyms (needed for joins)
CREATE POLICY "gym_select_authenticated" ON public.gyms
  FOR SELECT TO authenticated
  USING (true);

-- Create simple, non-recursive policies for gym_memberships
-- Users can view their own memberships
CREATE POLICY "membership_own_select" ON public.gym_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Gym owners can view all memberships in their gym (using subquery with no RLS)
CREATE POLICY "membership_owner_select" ON public.gym_memberships
  FOR SELECT TO authenticated
  USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );

-- Gym owners can manage memberships in their gym
CREATE POLICY "membership_owner_manage" ON public.gym_memberships
  FOR ALL TO authenticated
  USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );

-- Users can request to join gyms
CREATE POLICY "membership_join_request" ON public.gym_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'athlete');

-- Users can update their own membership (to leave)
CREATE POLICY "membership_own_update" ON public.gym_memberships
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
