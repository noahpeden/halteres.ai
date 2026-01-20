-- Add onboarding_completed flag to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
ON public.profiles(onboarding_completed)
WHERE onboarding_completed = false;

-- Existing users with workouts logged are considered onboarded
UPDATE public.profiles p
SET onboarding_completed = true
WHERE EXISTS (
  SELECT 1 FROM public.workout_results wr
  WHERE wr.user_id = p.id
);
