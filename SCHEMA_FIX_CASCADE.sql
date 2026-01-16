-- FIX CASCADING DELETES
-- Ensure that deleting a Project permanetly removes all related data.

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

-- 3. comments -> project_versions (if version is deleted, comments go too)
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
