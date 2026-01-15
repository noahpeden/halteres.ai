-- Grant access to workout_results table
GRANT ALL ON public.workout_results TO authenticated;
GRANT ALL ON public.workout_results TO anon;

-- Grant access to personal_records table
GRANT ALL ON public.personal_records TO authenticated;
GRANT ALL ON public.personal_records TO anon;

-- Grant access to social_interactions table
GRANT ALL ON public.social_interactions TO authenticated;
GRANT ALL ON public.social_interactions TO anon;

-- Grant access to ai_workout_feedback table
GRANT ALL ON public.ai_workout_feedback TO authenticated;
GRANT ALL ON public.ai_workout_feedback TO anon;
