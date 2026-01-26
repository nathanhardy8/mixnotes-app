-- Add client_version_visibility to projects table
-- Controls whether clients can see "all" versions or only the "latest"
-- Default is 'all' to maintain existing behavior

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS client_version_visibility text DEFAULT 'all' CHECK (client_version_visibility IN ('all', 'latest'));
