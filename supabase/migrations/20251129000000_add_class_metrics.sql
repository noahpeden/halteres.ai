-- Migration: Add class metrics to entities table
-- Adds support for CLASS entity type metrics (CrossFit/functional fitness classes)

-- Class size (number of athletes in the class)
ALTER TABLE entities ADD COLUMN IF NOT EXISTS class_size integer;

-- Average age of class members
ALTER TABLE entities ADD COLUMN IF NOT EXISTS average_age integer;

-- Whether elite/competitive athletes are present
ALTER TABLE entities ADD COLUMN IF NOT EXISTS has_elite_athletes boolean DEFAULT false;

-- Average years of training experience
ALTER TABLE entities ADD COLUMN IF NOT EXISTS average_experience_years numeric;

-- Skill distribution: {beginner: %, intermediate: %, advanced: %}
ALTER TABLE entities ADD COLUMN IF NOT EXISTS skill_distribution jsonb;

-- Class duration in minutes (default 60)
ALTER TABLE entities ADD COLUMN IF NOT EXISTS class_duration_minutes integer DEFAULT 60;

-- Warmup duration in minutes (default 15)
ALTER TABLE entities ADD COLUMN IF NOT EXISTS warmup_duration_minutes integer DEFAULT 15;

-- Add comment for documentation
COMMENT ON COLUMN entities.class_size IS 'Number of athletes in the class (for CLASS entity type)';
COMMENT ON COLUMN entities.average_age IS 'Average age of class members (for CLASS entity type)';
COMMENT ON COLUMN entities.has_elite_athletes IS 'Whether elite/competitive athletes are present (for CLASS entity type)';
COMMENT ON COLUMN entities.average_experience_years IS 'Average years of training experience (for CLASS entity type)';
COMMENT ON COLUMN entities.skill_distribution IS 'Skill level distribution as JSON: {beginner: %, intermediate: %, advanced: %}';
COMMENT ON COLUMN entities.class_duration_minutes IS 'Total class duration in minutes';
COMMENT ON COLUMN entities.warmup_duration_minutes IS 'Allocated warmup time in minutes';
