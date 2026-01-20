-- Complete onboarding for test athlete and add a display name
UPDATE public.profiles
SET onboarding_completed = true, display_name = 'Test Athlete'
WHERE id IN (
  SELECT id FROM auth.users WHERE email LIKE '%athlete1%'
);
