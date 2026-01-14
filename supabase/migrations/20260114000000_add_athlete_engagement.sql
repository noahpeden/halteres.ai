-- =============================================
-- ATHLETE ENGAGEMENT FEATURE MIGRATION
-- =============================================
-- This migration adds support for:
-- 1. Gyms - Organizations owned by coaches
-- 2. Gym Memberships - Athletes joining gyms
-- 3. Workout Results - Athletes logging results
-- 4. Personal Records - PR tracking
-- 5. Social Interactions - Fist bumps and comments
-- 6. AI Feedback - Workout analysis
-- =============================================

-- =============================================
-- 1. ENUM TYPES
-- =============================================

-- User role enum (coach or athlete)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('coach', 'athlete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Gym membership role enum
DO $$ BEGIN
    CREATE TYPE gym_membership_role AS ENUM ('owner', 'coach', 'athlete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Gym membership status enum
DO $$ BEGIN
    CREATE TYPE gym_membership_status AS ENUM ('pending', 'active', 'suspended', 'left');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Result scale enum (RX, Scaled, etc.)
DO $$ BEGIN
    CREATE TYPE result_scale AS ENUM ('rx', 'scaled', 'rx_plus', 'beginner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Result type enum
DO $$ BEGIN
    CREATE TYPE result_type AS ENUM ('time', 'rounds_reps', 'weight', 'reps', 'distance', 'calories');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Social interaction type enum
DO $$ BEGIN
    CREATE TYPE interaction_type AS ENUM ('fist_bump', 'comment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 2. GYMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.gyms (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    -- Owner is a coach user
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Gym details
    name text NOT NULL,
    description text,
    logo_url text,
    address text,
    city text,
    state text,
    country text,
    timezone text DEFAULT 'America/New_York',

    -- Invite code for athletes to join
    invite_code text UNIQUE,
    invite_code_expires_at timestamp with time zone,
    require_approval boolean DEFAULT false,

    deleted_at timestamp with time zone,

    PRIMARY KEY (id)
);

-- Indexes for gyms
CREATE INDEX IF NOT EXISTS idx_gyms_owner_id ON public.gyms(owner_id);
CREATE INDEX IF NOT EXISTS idx_gyms_invite_code ON public.gyms(invite_code) WHERE invite_code IS NOT NULL;

-- =============================================
-- 3. GYM MEMBERSHIPS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.gym_memberships (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    role gym_membership_role NOT NULL DEFAULT 'athlete',
    status gym_membership_status NOT NULL DEFAULT 'pending',

    -- When the athlete was approved/joined
    joined_at timestamp with time zone,
    approved_by uuid REFERENCES auth.users(id),

    -- Optional class assignment (references entities with type='CLASS')
    class_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,

    -- Display name within this gym
    nickname text,

    PRIMARY KEY (id),
    UNIQUE(gym_id, user_id)
);

-- Indexes for gym_memberships
CREATE INDEX IF NOT EXISTS idx_gym_memberships_gym_id ON public.gym_memberships(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_memberships_user_id ON public.gym_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_memberships_status ON public.gym_memberships(status);
CREATE INDEX IF NOT EXISTS idx_gym_memberships_class_id ON public.gym_memberships(class_id);

-- =============================================
-- 4. WORKOUT RESULTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.workout_results (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    -- Links
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_id uuid NOT NULL REFERENCES public.program_workouts(id) ON DELETE CASCADE,
    gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,

    -- Result type and values
    result_type result_type NOT NULL,

    -- For TIME results (stored in seconds)
    time_seconds integer,

    -- For ROUNDS+REPS results (AMRAP)
    rounds integer,
    reps integer,

    -- For WEIGHT results (stored in kg)
    weight_kg numeric,

    -- For REP/DISTANCE/CALORIE results
    count integer,

    -- Scale/modification
    scale result_scale NOT NULL DEFAULT 'rx',
    modifications text,

    -- Athlete notes and media
    notes text,
    photos jsonb DEFAULT '[]'::jsonb,

    -- Perceived effort (1-10 scale)
    perceived_effort integer CHECK (perceived_effort >= 1 AND perceived_effort <= 10),

    -- Whether this counts towards leaderboards
    include_in_leaderboard boolean DEFAULT true,

    -- PR flag (set by trigger)
    is_pr boolean DEFAULT false,
    pr_type text,

    deleted_at timestamp with time zone,

    PRIMARY KEY (id)
);

-- Indexes for workout_results
CREATE INDEX IF NOT EXISTS idx_workout_results_user_id ON public.workout_results(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_results_workout_id ON public.workout_results(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_results_gym_id ON public.workout_results(gym_id);
CREATE INDEX IF NOT EXISTS idx_workout_results_created_at ON public.workout_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_results_leaderboard ON public.workout_results(workout_id, result_type, scale)
    WHERE include_in_leaderboard = true AND deleted_at IS NULL;

-- =============================================
-- 5. PERSONAL RECORDS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.personal_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- PR category (predefined or custom)
    category text NOT NULL,
    custom_name text,

    -- PR value (depends on category)
    result_type result_type NOT NULL,
    time_seconds integer,
    weight_kg numeric,
    reps integer,
    rounds integer,
    distance_meters numeric,

    -- Scale for benchmark workouts
    scale result_scale DEFAULT 'rx',

    -- When the PR was achieved
    achieved_at timestamp with time zone NOT NULL DEFAULT now(),

    -- Link to the workout result that triggered this PR
    workout_result_id uuid REFERENCES public.workout_results(id) ON DELETE SET NULL,

    -- Previous PR tracking
    previous_value numeric,
    improvement_percentage numeric,

    notes text,

    PRIMARY KEY (id)
);

-- Indexes for personal_records
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON public.personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_category ON public.personal_records(category);
CREATE INDEX IF NOT EXISTS idx_personal_records_achieved_at ON public.personal_records(achieved_at DESC);

-- =============================================
-- 6. SOCIAL INTERACTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.social_interactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),

    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Target is a workout result
    workout_result_id uuid REFERENCES public.workout_results(id) ON DELETE CASCADE,

    -- For comment replies
    parent_comment_id uuid REFERENCES public.social_interactions(id) ON DELETE CASCADE,

    interaction_type interaction_type NOT NULL,

    -- For comments
    content text,

    deleted_at timestamp with time zone,

    PRIMARY KEY (id)
);

-- Indexes for social_interactions
CREATE INDEX IF NOT EXISTS idx_social_interactions_workout_result ON public.social_interactions(workout_result_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_user_id ON public.social_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_parent ON public.social_interactions(parent_comment_id);

-- Unique constraint to prevent duplicate fist bumps
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_fist_bump ON public.social_interactions(user_id, workout_result_id)
    WHERE interaction_type = 'fist_bump' AND deleted_at IS NULL;

-- =============================================
-- 7. AI WORKOUT FEEDBACK TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_workout_feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),

    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_result_id uuid REFERENCES public.workout_results(id) ON DELETE CASCADE,

    -- Feedback content
    performance_analysis text,
    strengths jsonb DEFAULT '[]'::jsonb,
    areas_for_improvement jsonb DEFAULT '[]'::jsonb,
    recovery_suggestions jsonb DEFAULT '[]'::jsonb,
    next_workout_recommendations jsonb DEFAULT '[]'::jsonb,

    -- Model tracking
    model_used text,
    prompt_tokens integer,
    completion_tokens integer,

    PRIMARY KEY (id)
);

-- Indexes for ai_workout_feedback
CREATE INDEX IF NOT EXISTS idx_ai_workout_feedback_user_id ON public.ai_workout_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_workout_feedback_result_id ON public.ai_workout_feedback(workout_result_id);

-- =============================================
-- 8. EXTEND PROFILES TABLE
-- =============================================

-- Add role column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'coach';

-- Add display name
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name text;

-- Add profile photo URL
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Add notification preferences
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"new_workout": true, "pr_achieved": true, "result_comment": true, "result_fist_bump": true}'::jsonb;

-- Add athlete-specific metrics (migrated from CLIENT entities)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bench_1rm numeric;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS squat_1rm numeric;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deadlift_1rm numeric;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS weight_kg numeric;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS height_cm numeric;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mile_time text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS recovery_score integer;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS injury_history text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- =============================================
-- 9. EXTEND PROGRAMS TABLE
-- =============================================

-- Add gym_id to programs
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_programs_gym_id ON public.programs(gym_id);

-- =============================================
-- 10. EXTEND PROGRAM_WORKOUTS TABLE
-- =============================================

-- Add gym_id to program_workouts for easier querying
ALTER TABLE public.program_workouts
ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL;

-- Add benchmark flag
ALTER TABLE public.program_workouts
ADD COLUMN IF NOT EXISTS is_benchmark boolean DEFAULT false;

-- Add benchmark name
ALTER TABLE public.program_workouts
ADD COLUMN IF NOT EXISTS benchmark_name text;

CREATE INDEX IF NOT EXISTS idx_program_workouts_gym_id ON public.program_workouts(gym_id);

-- =============================================
-- 11. HELPER FUNCTIONS
-- =============================================

-- Function to generate a unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code(length int DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result text := '';
    i int;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Function to get leaderboard for a workout
CREATE OR REPLACE FUNCTION get_workout_leaderboard(
    p_workout_id uuid,
    p_gym_id uuid DEFAULT NULL,
    p_scale result_scale DEFAULT NULL,
    p_limit int DEFAULT 50
)
RETURNS TABLE (
    rank bigint,
    user_id uuid,
    display_name text,
    profile_photo_url text,
    result_value text,
    result_type result_type,
    time_seconds integer,
    rounds integer,
    reps integer,
    weight_kg numeric,
    scale result_scale,
    is_pr boolean,
    fist_bump_count bigint,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ranked_results AS (
        SELECT
            wr.*,
            COALESCE(p.display_name, p.full_name, 'Anonymous') as athlete_name,
            p.profile_photo_url as athlete_photo,
            (SELECT COUNT(*) FROM public.social_interactions si
             WHERE si.workout_result_id = wr.id
             AND si.interaction_type = 'fist_bump'
             AND si.deleted_at IS NULL) as fist_bumps,
            ROW_NUMBER() OVER (
                ORDER BY
                    CASE WHEN wr.result_type = 'time' THEN wr.time_seconds END ASC NULLS LAST,
                    CASE WHEN wr.result_type = 'rounds_reps' THEN (COALESCE(wr.rounds, 0) * 1000 + COALESCE(wr.reps, 0)) END DESC,
                    CASE WHEN wr.result_type = 'weight' THEN wr.weight_kg END DESC,
                    CASE WHEN wr.result_type = 'reps' THEN wr.count END DESC,
                    CASE WHEN wr.result_type = 'distance' THEN wr.count END DESC,
                    CASE WHEN wr.result_type = 'calories' THEN wr.count END DESC
            ) as position
        FROM public.workout_results wr
        JOIN public.profiles p ON p.id = wr.user_id
        WHERE wr.workout_id = p_workout_id
            AND wr.deleted_at IS NULL
            AND wr.include_in_leaderboard = true
            AND (p_gym_id IS NULL OR wr.gym_id = p_gym_id)
            AND (p_scale IS NULL OR wr.scale = p_scale)
    )
    SELECT
        rr.position as rank,
        rr.user_id,
        rr.athlete_name as display_name,
        rr.athlete_photo as profile_photo_url,
        CASE
            WHEN rr.result_type = 'time' THEN
                format('%s:%s', (rr.time_seconds / 60)::text, lpad((rr.time_seconds % 60)::text, 2, '0'))
            WHEN rr.result_type = 'rounds_reps' THEN
                format('%s + %s', COALESCE(rr.rounds, 0)::text, COALESCE(rr.reps, 0)::text)
            WHEN rr.result_type = 'weight' THEN
                format('%s kg', rr.weight_kg::text)
            WHEN rr.result_type IN ('reps', 'distance', 'calories') THEN
                COALESCE(rr.count, 0)::text
            ELSE ''
        END as result_value,
        rr.result_type,
        rr.time_seconds,
        rr.rounds,
        rr.reps,
        rr.weight_kg,
        rr.scale,
        rr.is_pr,
        rr.fist_bumps as fist_bump_count,
        rr.created_at
    FROM ranked_results rr
    ORDER BY rr.position
    LIMIT p_limit;
END;
$$;

-- =============================================
-- 12. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_workout_feedback ENABLE ROW LEVEL SECURITY;

-- GYMS POLICIES
CREATE POLICY "Gym owners have full access"
ON public.gyms FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members can view their gyms"
ON public.gyms FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT gym_id FROM public.gym_memberships
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

CREATE POLICY "Anyone can view gyms by invite code"
ON public.gyms FOR SELECT
TO authenticated
USING (invite_code IS NOT NULL AND deleted_at IS NULL);

-- GYM MEMBERSHIPS POLICIES
CREATE POLICY "Users can view own memberships"
ON public.gym_memberships FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Gym owners can view all memberships"
ON public.gym_memberships FOR SELECT
TO authenticated
USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
);

CREATE POLICY "Gym owners can manage memberships"
ON public.gym_memberships FOR ALL
TO authenticated
USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
)
WITH CHECK (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can request to join gyms"
ON public.gym_memberships FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND
    role = 'athlete'
);

CREATE POLICY "Users can leave gyms"
ON public.gym_memberships FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND status = 'left');

-- WORKOUT RESULTS POLICIES
CREATE POLICY "Users can manage own results"
ON public.workout_results FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Gym members can view gym results"
ON public.workout_results FOR SELECT
TO authenticated
USING (
    gym_id IN (
        SELECT gym_id FROM public.gym_memberships
        WHERE user_id = auth.uid() AND status = 'active'
    ) AND
    include_in_leaderboard = true AND
    deleted_at IS NULL
);

CREATE POLICY "Coaches can view all gym results"
ON public.workout_results FOR SELECT
TO authenticated
USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
);

-- PERSONAL RECORDS POLICIES
CREATE POLICY "Users can manage own PRs"
ON public.personal_records FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Gym members can view gym member PRs"
ON public.personal_records FOR SELECT
TO authenticated
USING (
    user_id IN (
        SELECT gm.user_id FROM public.gym_memberships gm
        WHERE gm.gym_id IN (
            SELECT gym_id FROM public.gym_memberships
            WHERE user_id = auth.uid() AND status = 'active'
        ) AND gm.status = 'active'
    )
);

-- SOCIAL INTERACTIONS POLICIES
CREATE POLICY "Users can manage own interactions"
ON public.social_interactions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view interactions on visible results"
ON public.social_interactions FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL AND
    workout_result_id IN (
        SELECT id FROM public.workout_results
        WHERE user_id = auth.uid()
        OR (gym_id IN (
            SELECT gym_id FROM public.gym_memberships
            WHERE user_id = auth.uid() AND status = 'active'
        ) AND include_in_leaderboard = true)
    )
);

-- AI WORKOUT FEEDBACK POLICIES
CREATE POLICY "Users can view own AI feedback"
ON public.ai_workout_feedback FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage AI feedback"
ON public.ai_workout_feedback FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- 13. GRANTS
-- =============================================

-- Grant access to new tables
GRANT ALL ON TABLE public.gyms TO authenticated;
GRANT ALL ON TABLE public.gym_memberships TO authenticated;
GRANT ALL ON TABLE public.workout_results TO authenticated;
GRANT ALL ON TABLE public.personal_records TO authenticated;
GRANT ALL ON TABLE public.social_interactions TO authenticated;
GRANT ALL ON TABLE public.ai_workout_feedback TO authenticated;
GRANT ALL ON TABLE public.ai_workout_feedback TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION generate_invite_code(int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workout_leaderboard(uuid, uuid, result_scale, int) TO authenticated;

-- =============================================
-- 14. UPDATE handle_new_user FUNCTION
-- =============================================

-- Update the handle_new_user function to include role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if a profile already exists for the user
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        -- Insert a new row into public.profiles
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
            'coach'  -- Default to coach, can be updated during onboarding
        );
    END IF;
    RETURN NEW;
END;
$function$;
