-- Create weekly_trends table for storing AI-generated weekly performance analysis
CREATE TABLE IF NOT EXISTS public.weekly_trends (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start timestamp with time zone NOT NULL,
  workouts_completed integer DEFAULT 0,
  prs_achieved integer DEFAULT 0,
  summary text,
  highlights jsonb,
  areas_to_focus jsonb,
  next_week_goals jsonb,
  model_used text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Ensure one record per user per week
  UNIQUE (user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_trends ENABLE ROW LEVEL SECURITY;

-- Users can view their own trends
CREATE POLICY "Users can view own weekly trends"
  ON public.weekly_trends FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own trends
CREATE POLICY "Users can insert own weekly trends"
  ON public.weekly_trends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own trends
CREATE POLICY "Users can update own weekly trends"
  ON public.weekly_trends FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_weekly_trends_user_week
  ON public.weekly_trends(user_id, week_start DESC);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.weekly_trends TO authenticated;
