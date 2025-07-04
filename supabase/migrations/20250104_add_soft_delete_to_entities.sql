-- Add soft delete column to entities table
ALTER TABLE entities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance when filtering non-deleted entities
CREATE INDEX IF NOT EXISTS idx_entities_deleted_at ON entities(deleted_at);

-- Update RLS policies to filter out soft deleted entities by default
-- First, drop existing select policy if it exists
DROP POLICY IF EXISTS "Users can view own entities" ON entities;

-- Create new policy that filters out soft deleted entities
CREATE POLICY "Users can view own non-deleted entities" ON entities
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Update policy for insert (no change needed)
DROP POLICY IF EXISTS "Users can create own entities" ON entities;
CREATE POLICY "Users can create own entities" ON entities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update policy for update to prevent updating deleted entities
DROP POLICY IF EXISTS "Users can update own entities" ON entities;
CREATE POLICY "Users can update own non-deleted entities" ON entities
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Update policy for delete (soft delete only)
DROP POLICY IF EXISTS "Users can delete own entities" ON entities;
CREATE POLICY "Users can soft delete own entities" ON entities
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);