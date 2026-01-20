-- Auto-approve all pending gym memberships (remove approval process)
-- Athletes who enter a gym code should be auto-approved
UPDATE public.gym_memberships
SET status = 'active', joined_at = COALESCE(joined_at, NOW())
WHERE status = 'pending';
