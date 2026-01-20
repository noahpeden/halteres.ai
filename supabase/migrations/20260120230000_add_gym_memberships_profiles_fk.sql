-- Add foreign key from gym_memberships.user_id to profiles.id
-- This allows Supabase PostgREST to join gym_memberships with profiles
-- Both user_id and profiles.id reference the same auth.users(id)

ALTER TABLE public.gym_memberships
ADD CONSTRAINT gym_memberships_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
