-- Add columns to program_workouts table to support two-phase generation
ALTER TABLE program_workouts
ADD COLUMN IF NOT EXISTS body_skeleton TEXT,
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending'
  CHECK (generation_status IN ('pending', 'skeleton', 'detailed', 'enhancing')),
ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- Add columns to programs table for progress tracking
ALTER TABLE programs
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS generation_progress JSONB DEFAULT '{"current_week": 0, "total_weeks": 0}',
ADD COLUMN IF NOT EXISTS generation_session_id TEXT;

-- Backfill existing workouts that have body content as 'detailed'
UPDATE program_workouts
SET generation_status = 'detailed'
WHERE body IS NOT NULL AND generation_status = 'pending';

-- Extract week numbers from titles for existing workouts
UPDATE program_workouts
SET week_number = CAST(SUBSTRING(title FROM 'Week ([0-9]+)') AS INTEGER)
WHERE title LIKE 'Week %' AND week_number IS NULL;

-- Add index for performance on generation_status
CREATE INDEX IF NOT EXISTS idx_program_workouts_generation_status
ON program_workouts(generation_status);

-- Add index for week_number queries
CREATE INDEX IF NOT EXISTS idx_program_workouts_week_number
ON program_workouts(week_number);

-- Update programs that have workouts as 'completed'
UPDATE programs
SET generation_status = 'completed'
WHERE id IN (
  SELECT DISTINCT program_id FROM program_workouts WHERE body IS NOT NULL
);
