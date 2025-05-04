-- Add completion tracking columns to program_workouts table
ALTER TABLE program_workouts 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add index to improve query performance for filtering completed workouts
CREATE INDEX IF NOT EXISTS idx_program_workouts_completed ON program_workouts(completed);

-- Add comment to document the purpose of these columns
COMMENT ON COLUMN program_workouts.completed IS 'Indicates whether a workout has been completed';
COMMENT ON COLUMN program_workouts.completed_at IS 'Timestamp when the workout was marked as completed'; 