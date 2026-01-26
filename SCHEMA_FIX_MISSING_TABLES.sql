-- Fix missing tables and columns
-- 1. Create revision_rounds table if it doesn't exist
CREATE TABLE IF NOT EXISTS revision_rounds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    project_version_id uuid REFERENCES project_versions(id) ON DELETE CASCADE,
    title text,
    status text DEFAULT 'draft', -- draft, submitted, acknowledged, completed
    author_type text, -- ENGINEER, CLIENT
    author_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    submitted_at timestamptz,
    completed_at timestamptz
);

-- 2. Add columns to comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS revision_round_id uuid REFERENCES revision_rounds(id),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open', -- open, resolved
ADD COLUMN IF NOT EXISTS needs_clarification boolean DEFAULT false;

-- 3. Add indexes for performance (optional but good)
CREATE INDEX IF NOT EXISTS idx_revision_rounds_project_version ON revision_rounds(project_version_id);
CREATE INDEX IF NOT EXISTS idx_comments_revision_round ON comments(revision_round_id);
