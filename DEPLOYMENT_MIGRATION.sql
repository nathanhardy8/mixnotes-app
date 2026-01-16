-- DEPLOYMENT MIGRATION SCRIPT
-- Run this script in your Production Supabase SQL Editor to apply all recent fixes.

-- ==========================================
-- 1. REALTIME & GUEST ACCESS (SCHEMA_FIX_REALTIME.sql)
-- ==========================================

-- Ensure share_token column exists
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON public.projects(share_token);

-- Enable RLS for Project Versions
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

-- Allow Anon (Guests) to SELECT project_versions if parent project has share_token
CREATE POLICY "Allow anon select project_versions with share_token"
ON public.project_versions
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_versions.project_id
    AND projects.share_token IS NOT NULL
  )
);

-- Allow Anon (Guests) to SELECT projects table (needed for joins)
CREATE POLICY "Allow anon select projects with share_token"
ON public.projects
FOR SELECT
TO anon
USING (
  share_token IS NOT NULL
);

-- Ensure Realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE project_versions;


-- ==========================================
-- 2. RESTORE ENGINEER ACCESS (SCHEMA_FIX_ACCESS.sql)
-- ==========================================

-- Projects: Allow Engineers to do everything on their own projects
-- (Casting explicitly to text to avoid UUID/Text type errors)
CREATE POLICY "Enable access to own projects"
ON public.projects
FOR ALL
TO authenticated
USING (auth.uid()::text = engineer_id::text)
WITH CHECK (auth.uid()::text = engineer_id::text);

-- Project Versions: Allow Engineers to access versions of their projects
CREATE POLICY "Enable access to own project versions"
ON public.project_versions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_versions.project_id
    AND projects.engineer_id::text = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_versions.project_id
    AND projects.engineer_id::text = auth.uid()::text
  )
);


-- ==========================================
-- 3. FIX CASCADING DELETES (SCHEMA_FIX_CASCADE.sql)
-- ==========================================

-- 1. project_versions -> projects
ALTER TABLE public.project_versions
DROP CONSTRAINT IF EXISTS project_versions_project_id_fkey,
ADD CONSTRAINT project_versions_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;

-- 2. comments -> projects
ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS comments_project_id_fkey,
ADD CONSTRAINT comments_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;

-- 3. comments -> project_versions
ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS comments_project_version_id_fkey,
ADD CONSTRAINT comments_project_version_id_fkey
    FOREIGN KEY (project_version_id)
    REFERENCES public.project_versions(id)
    ON DELETE CASCADE;

-- 4. review_magic_links -> projects
ALTER TABLE public.review_magic_links
DROP CONSTRAINT IF EXISTS review_magic_links_project_id_fkey,
ADD CONSTRAINT review_magic_links_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;


-- ==========================================
-- 4. PERFORMANCE OPTIMIZATION (SCHEMA_OPTIMIZE.sql)
-- ==========================================

-- Index for Engineer ID (used in RLS checks)
CREATE INDEX IF NOT EXISTS idx_projects_engineer_id ON public.projects(engineer_id);

-- Index for Project Versions lookup
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON public.project_versions(project_id);

-- (Note: idx_projects_share_token was created in step 1)
