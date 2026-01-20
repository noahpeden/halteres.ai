-- Migration: Fix handle_new_user to read role from user metadata
-- This ensures athletes get the correct role from signup, not defaulting to 'coach'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_role user_role;
    user_gym_code TEXT;
    gym_record RECORD;
BEGIN
    -- Read role from user metadata, default to 'coach' if not specified
    user_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'coach'
    );

    -- Read gym invite code from metadata (for athletes)
    user_gym_code := NEW.raw_user_meta_data->>'gym_invite_code';

    -- Check if a profile already exists for the user
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        -- Insert profile with role from metadata
        -- Athletes don't need subscription/trial info
        IF user_role = 'athlete' THEN
            INSERT INTO public.profiles (
                id,
                subscription_status,
                role,
                onboarding_completed
            ) VALUES (
                NEW.id,
                NULL,  -- Athletes don't have subscriptions
                'athlete',
                false
            );
        ELSE
            -- Coaches get trial subscription
            INSERT INTO public.profiles (
                id,
                subscription_status,
                trial_start_date,
                trial_end_date,
                generations_remaining,
                generations_today,
                role
            ) VALUES (
                NEW.id,
                'trialing',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP + INTERVAL '7 days',
                15,
                0,
                'coach'
            );
        END IF;
    END IF;

    -- If athlete provided a gym code, auto-join the gym
    IF user_role = 'athlete' AND user_gym_code IS NOT NULL AND user_gym_code != '' THEN
        -- Find the gym by invite code
        SELECT id INTO gym_record
        FROM public.gyms
        WHERE invite_code = UPPER(user_gym_code)
        AND deleted_at IS NULL
        LIMIT 1;

        -- If gym found, create membership (always auto-approve, no approval process)
        IF gym_record.id IS NOT NULL THEN
            -- Check if membership doesn't already exist
            IF NOT EXISTS (
                SELECT 1 FROM public.gym_memberships
                WHERE gym_id = gym_record.id AND user_id = NEW.id
            ) THEN
                INSERT INTO public.gym_memberships (
                    gym_id,
                    user_id,
                    role,
                    status,
                    joined_at
                ) VALUES (
                    gym_record.id,
                    NEW.id,
                    'athlete',
                    'active',
                    CURRENT_TIMESTAMP
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- Also update existing athletes who have wrong role
-- (This is a one-time fix for users who signed up before this migration)
UPDATE public.profiles p
SET role = 'athlete'
WHERE EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p.id
    AND u.raw_user_meta_data->>'role' = 'athlete'
)
AND p.role = 'coach';

-- Auto-approve all pending gym memberships (remove approval process)
UPDATE public.gym_memberships
SET status = 'active', joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP)
WHERE status = 'pending';
