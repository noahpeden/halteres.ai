-- Fix athletes who incorrectly have subscription_status set
-- Athletes should have NULL subscription_status since they don't have subscriptions
UPDATE public.profiles
SET subscription_status = NULL, trial_start_date = NULL, trial_end_date = NULL, generations_remaining = NULL
WHERE role = 'athlete'
AND subscription_status IS NOT NULL;
