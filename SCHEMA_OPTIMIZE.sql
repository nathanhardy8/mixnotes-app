-- OPTIMIZE PERFORMANCE
-- Add indexes to columns used in RLS policies and frequent lookups.

-- Index for Engineer ID (used in RLS checks)
CREATE INDEX IF NOT EXISTS idx_projects_engineer_id ON public.projects(engineer_id);

-- Index for Share Token (used in Guest RLS)
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON public.projects(share_token);

-- Index for Project Versions lookup (used in RLS and Realtime)
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON public.project_versions(project_id);


