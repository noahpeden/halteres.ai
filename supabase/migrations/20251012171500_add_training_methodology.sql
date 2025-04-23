-- Add training_methodology column to programs table
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS training_methodology text;

-- Comment on the column
COMMENT ON COLUMN public.programs.training_methodology IS 'Stores the selected training methodology for the program'; 