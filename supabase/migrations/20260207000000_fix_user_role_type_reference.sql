-- Fix: The trigger function couldn't find 'user_role' type because it wasn't schema-qualified
-- Error was: "type \"user_role\" does not exist"
-- The auth schema runs the trigger and can't find types in public schema without explicit reference
-- Solution: Add SET search_path = public AND fully qualify the type as public.user_role

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_role public.user_role;
    v_gym_code TEXT;
    v_gym_id UUID;
BEGIN
    -- Read role from user metadata, default to 'coach' if not specified
    v_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::public.user_role,
        'coach'::public.user_role
    );

    -- Read gym invite code from metadata (for athletes)
    v_gym_code := NEW.raw_user_meta_data->>'gym_invite_code';

    -- Check if a profile already exists for the user
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        -- Insert profile with role from metadata
        IF v_role = 'athlete'::public.user_role THEN
            INSERT INTO public.profiles (
                id,
                subscription_status,
                role,
                is_active,
                onboarding_completed
            ) VALUES (
                NEW.id,
                NULL,
                'athlete'::public.user_role,
                true,
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
                role,
                is_active,
                onboarding_completed
            ) VALUES (
                NEW.id,
                'trialing',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP + INTERVAL '7 days',
                15,
                0,
                'coach'::public.user_role,
                true,
                false
            );
        END IF;
    END IF;

    -- If athlete provided a gym code, auto-join the gym
    IF v_role = 'athlete'::public.user_role AND v_gym_code IS NOT NULL AND v_gym_code != '' THEN
        -- Find the gym by invite code
        SELECT id INTO v_gym_id
        FROM public.gyms
        WHERE invite_code = UPPER(v_gym_code)
        AND deleted_at IS NULL
        LIMIT 1;

        -- If gym found, create membership (always auto-approve)
        IF v_gym_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.gym_memberships
                WHERE gym_id = v_gym_id AND user_id = NEW.id
            ) THEN
                INSERT INTO public.gym_memberships (
                    gym_id,
                    user_id,
                    role,
                    status,
                    joined_at
                ) VALUES (
                    v_gym_id,
                    NEW.id,
                    'athlete',
                    'active',
                    CURRENT_TIMESTAMP
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't block user creation
        RAISE LOG 'handle_new_user failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$function$;
