-- Make project_version_id NOT NULL if possible
-- We might have some comments without versions if the migration failed for some mock data projects.
-- For safety, we will only add the constraint if we're sure, but let's at least add the index if missing.

create index if not exists idx_comments_project_version_id on public.comments(project_version_id);

-- Optional: Clean up orphaned comments? Or just leave them hidden.
-- Let's NOT make it NOT NULL strictly yet to avoid breaking those failure cases in dev.
-- But the application code will enforce providing it.
