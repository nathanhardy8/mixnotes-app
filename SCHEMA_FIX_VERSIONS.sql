-- Enable RLS updates/deletes for project_versions
-- Previously we might only have had Select/Insert policies?

-- 1. Review/Add Policies for PROJECT VERSIONS

drop policy if exists "Enable insert for users based on project ownership" on project_versions;
create policy "Enable insert for users based on project ownership"
on project_versions for insert
with check (
  auth.uid()::text = (
    select engineer_id::text from projects where id = project_versions.project_id
  )
);

drop policy if exists "Enable update for users based on project ownership" on project_versions;
create policy "Enable update for users based on project ownership"
on project_versions for update
using (
  auth.uid()::text = (
    select engineer_id::text from projects where id = project_versions.project_id
  )
)
with check (
  auth.uid()::text = (
    select engineer_id::text from projects where id = project_versions.project_id
  )
);

drop policy if exists "Enable delete for users based on project ownership" on project_versions;
create policy "Enable delete for users based on project ownership"
on project_versions for delete
using (
  auth.uid()::text = (
    select engineer_id::text from projects where id = project_versions.project_id
  )
);

-- 2. Ensure Comments can be deleted if we want manual cleaning or cascade
-- Often comments are linked to versions.
-- Policy: Engineer can delete comments on their projects.

drop policy if exists "Enable delete for comments based on project engineer" on comments;
create policy "Enable delete for comments based on project engineer"
on comments for delete
using (
  auth.uid()::text = (
    select engineer_id::text from projects where id = comments.project_id
  )
);

-- Note: If these policies already exist, this might fail or duplicate.
-- Ideally we check existence, but simpler to just run and ignore dupes in dev env
-- or use "create policy if not exists" if using PG 14+ specific syntax or DO blocks.
-- For standard Supabase SQL editor usage, we often drop and recreate if needed.
-- drop policy if exists "Enable update..." on project_versions;
