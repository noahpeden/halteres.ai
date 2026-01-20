-- =============================================
-- Workout Feedback System Migration
-- =============================================

-- Feedback rating enum
CREATE TYPE public.feedback_rating AS ENUM ('thumbs_up', 'thumbs_down');

-- Result feedback type enum
CREATE TYPE public.result_feedback_type AS ENUM ('coach_to_athlete', 'self_assessment');

-- =============================================
-- Template Feedback Table
-- Coach/athlete feedback on workout design
-- =============================================
CREATE TABLE public.workout_template_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Links
    workout_id uuid NOT NULL REFERENCES public.program_workouts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,

    -- Feedback data
    rating public.feedback_rating NOT NULL,
    notes text,

    -- Context at time of feedback (for RAG)
    feedback_context jsonb DEFAULT '{}'::jsonb,

    -- Embedding for semantic search (1536 dimensions for OpenAI text-embedding-3-small)
    embedding vector(1536),

    -- One feedback per user per workout
    UNIQUE(workout_id, user_id)
);

-- =============================================
-- Result Feedback Table
-- Self-assessment or coach-to-athlete feedback
-- =============================================
CREATE TABLE public.workout_result_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Links
    workout_result_id uuid NOT NULL REFERENCES public.workout_results(id) ON DELETE CASCADE,
    from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,

    -- Feedback type
    feedback_type public.result_feedback_type NOT NULL,

    -- Feedback data
    rating public.feedback_rating NOT NULL,
    notes text,

    -- Context at time of feedback (for RAG)
    feedback_context jsonb DEFAULT '{}'::jsonb,

    -- Embedding for semantic search
    embedding vector(1536),

    -- One feedback per user per result
    UNIQUE(workout_result_id, from_user_id)
);

-- =============================================
-- Indexes
-- =============================================

-- HNSW indexes for embedding similarity search (faster than ivfflat for queries)
CREATE INDEX idx_template_feedback_embedding ON public.workout_template_feedback
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_result_feedback_embedding ON public.workout_result_feedback
    USING hnsw (embedding vector_cosine_ops);

-- Standard indexes for common queries
CREATE INDEX idx_template_feedback_workout ON public.workout_template_feedback(workout_id);
CREATE INDEX idx_template_feedback_user ON public.workout_template_feedback(user_id);
CREATE INDEX idx_template_feedback_gym ON public.workout_template_feedback(gym_id);
CREATE INDEX idx_template_feedback_rating ON public.workout_template_feedback(rating);

CREATE INDEX idx_result_feedback_result ON public.workout_result_feedback(workout_result_id);
CREATE INDEX idx_result_feedback_from_user ON public.workout_result_feedback(from_user_id);
CREATE INDEX idx_result_feedback_to_user ON public.workout_result_feedback(to_user_id);
CREATE INDEX idx_result_feedback_gym ON public.workout_result_feedback(gym_id);
CREATE INDEX idx_result_feedback_rating ON public.workout_result_feedback(rating);

-- =============================================
-- Updated_at Triggers
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_template_feedback_updated_at
    BEFORE UPDATE ON public.workout_template_feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_feedback_updated_at();

CREATE TRIGGER set_result_feedback_updated_at
    BEFORE UPDATE ON public.workout_result_feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_feedback_updated_at();

-- =============================================
-- RLS Policies - Template Feedback
-- =============================================
ALTER TABLE public.workout_template_feedback ENABLE ROW LEVEL SECURITY;

-- Users can manage their own feedback
CREATE POLICY "Users can manage own template feedback"
ON public.workout_template_feedback FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Gym members can view template feedback for gym workouts
CREATE POLICY "Gym members can view template feedback"
ON public.workout_template_feedback FOR SELECT
TO authenticated
USING (
    gym_id IN (
        SELECT gm.gym_id FROM public.gym_memberships gm
        WHERE gm.user_id = auth.uid() AND gm.status = 'active'
    )
);

-- Service role can manage all feedback
CREATE POLICY "Service role manages template feedback"
ON public.workout_template_feedback FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- RLS Policies - Result Feedback
-- =============================================
ALTER TABLE public.workout_result_feedback ENABLE ROW LEVEL SECURITY;

-- Users can manage their own feedback (as giver)
CREATE POLICY "Users can manage own result feedback"
ON public.workout_result_feedback FOR ALL
TO authenticated
USING (from_user_id = auth.uid())
WITH CHECK (from_user_id = auth.uid());

-- Users can view feedback received
CREATE POLICY "Users can view feedback received"
ON public.workout_result_feedback FOR SELECT
TO authenticated
USING (to_user_id = auth.uid());

-- Gym owners can view all gym feedback
CREATE POLICY "Gym owners can view all gym feedback"
ON public.workout_result_feedback FOR SELECT
TO authenticated
USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
);

-- Service role can manage all feedback
CREATE POLICY "Service role manages result feedback"
ON public.workout_result_feedback FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- RPC Function: Match Feedback Workouts (for RAG)
-- =============================================
CREATE OR REPLACE FUNCTION public.match_feedback_workouts(
    query_embedding vector(1536),
    rating_filter public.feedback_rating DEFAULT NULL,
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    workout_id uuid,
    workout_title text,
    workout_body text,
    feedback_rating public.feedback_rating,
    feedback_notes text,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pw.id AS workout_id,
        pw.title AS workout_title,
        pw.body AS workout_body,
        wtf.rating AS feedback_rating,
        wtf.notes AS feedback_notes,
        1 - (wtf.embedding <=> query_embedding) AS similarity
    FROM public.workout_template_feedback wtf
    JOIN public.program_workouts pw ON pw.id = wtf.workout_id
    WHERE
        wtf.embedding IS NOT NULL
        AND (rating_filter IS NULL OR wtf.rating = rating_filter)
        AND 1 - (wtf.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- =============================================
-- RPC Function: Get Feedback Aggregation
-- =============================================
CREATE OR REPLACE FUNCTION public.get_feedback_aggregation(
    p_gym_id uuid DEFAULT NULL,
    p_methodology text DEFAULT NULL
)
RETURNS TABLE (
    workout_type text,
    thumbs_up_count bigint,
    thumbs_down_count bigint,
    total_feedback bigint,
    approval_rate numeric,
    sample_notes text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(pw.tags->>'workout_type', 'unknown') AS workout_type,
        COUNT(*) FILTER (WHERE wtf.rating = 'thumbs_up') AS thumbs_up_count,
        COUNT(*) FILTER (WHERE wtf.rating = 'thumbs_down') AS thumbs_down_count,
        COUNT(*) AS total_feedback,
        ROUND(
            COUNT(*) FILTER (WHERE wtf.rating = 'thumbs_up')::numeric /
            NULLIF(COUNT(*), 0) * 100, 1
        ) AS approval_rate,
        (array_agg(DISTINCT wtf.notes) FILTER (WHERE wtf.notes IS NOT NULL))[1:5] AS sample_notes
    FROM public.workout_template_feedback wtf
    JOIN public.program_workouts pw ON pw.id = wtf.workout_id
    JOIN public.programs p ON p.id = pw.program_id
    WHERE
        (p_gym_id IS NULL OR wtf.gym_id = p_gym_id)
        AND (p_methodology IS NULL OR p.training_methodology = p_methodology)
    GROUP BY COALESCE(pw.tags->>'workout_type', 'unknown')
    ORDER BY total_feedback DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.match_feedback_workouts TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_feedback_workouts TO service_role;
GRANT EXECUTE ON FUNCTION public.get_feedback_aggregation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feedback_aggregation TO service_role;

-- Grant table permissions
GRANT ALL ON public.workout_template_feedback TO authenticated;
GRANT ALL ON public.workout_template_feedback TO service_role;
GRANT ALL ON public.workout_result_feedback TO authenticated;
GRANT ALL ON public.workout_result_feedback TO service_role;
