-- Ensure share_token column exists (fix for error 42703)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON public.projects(share_token);

-- Enable RLS for Project Versions if not already
alter table public.project_versions enable row level security;

-- Allow Anon (Guests) to SELECT project_versions if the parent project has a share_token
create policy "Allow anon select project_versions with share_token"
on public.project_versions
for select
to anon
using (
  exists (
    select 1 from projects
    where projects.id = project_versions.project_id
    and projects.share_token is not null
  )
);

-- Allow Anon (Guests) to SELECT projects table (needed for the join check and project realtime)
-- Only if share_token is present
create policy "Allow anon select projects with share_token"
on public.projects
for select
to anon
using (
  share_token is not null
);

-- Ensure Realtime is enabled for these tables
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table project_versions;
