-- Fix grants for feedback tables

-- Grant permissions on tables
GRANT ALL ON public.workout_template_feedback TO authenticated;
GRANT ALL ON public.workout_template_feedback TO service_role;
GRANT ALL ON public.workout_template_feedback TO anon;

GRANT ALL ON public.workout_result_feedback TO authenticated;
GRANT ALL ON public.workout_result_feedback TO service_role;
GRANT ALL ON public.workout_result_feedback TO anon;

-- Grant execute on RPC functions
GRANT EXECUTE ON FUNCTION public.match_feedback_workouts TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_feedback_workouts TO service_role;
GRANT EXECUTE ON FUNCTION public.match_feedback_workouts TO anon;

GRANT EXECUTE ON FUNCTION public.get_feedback_aggregation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feedback_aggregation TO service_role;
GRANT EXECUTE ON FUNCTION public.get_feedback_aggregation TO anon;
