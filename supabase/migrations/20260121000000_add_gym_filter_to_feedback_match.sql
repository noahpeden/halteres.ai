-- =============================================
-- Add gym_id filtering to match_feedback_workouts
-- Ensures feedback RAG search is scoped to the gym
-- =============================================

-- Drop existing function and recreate with gym_id parameter
DROP FUNCTION IF EXISTS public.match_feedback_workouts(vector(1536), public.feedback_rating, float, int);

CREATE OR REPLACE FUNCTION public.match_feedback_workouts(
    query_embedding vector(1536),
    p_gym_id uuid DEFAULT NULL,
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
        AND (p_gym_id IS NULL OR wtf.gym_id = p_gym_id)
        AND (rating_filter IS NULL OR wtf.rating = rating_filter)
        AND 1 - (wtf.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.match_feedback_workouts TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_feedback_workouts TO service_role;
