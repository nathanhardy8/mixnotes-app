-- Add missing columns to comments table to support new features
-- This fixes the issue where comment submission fails due to unknown columns

ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS revision_round_id uuid REFERENCES revision_rounds(id),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS needs_clarification boolean DEFAULT false;
