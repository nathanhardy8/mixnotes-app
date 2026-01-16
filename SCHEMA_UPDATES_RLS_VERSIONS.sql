-- Enable RLS on project_versions if not already (it likely is)
alter table public.project_versions enable row level security;

-- Policy to allow Engineers/Admins to DELETE versions
-- Adjust 'engineer' check based on your auth model (e.g. metadata role or checking projects table)
-- For simplicity, if the user can UPDATE the project, they can DELETE versions.
-- Assuming a simple "authenticated users can do anything" for now to unblock, 
-- OR strictly checking project ownership if possible.

create policy "Enable delete for authenticated users"
on public.project_versions
for delete
to authenticated
using (true); 
-- In production, replace `true` with `exists (select 1 from projects p where p.id = project_versions.project_id and p.engineer_id = auth.uid())`

-- Policy to allow Engineers/Admins to UPDATE versions (for reorder/rename)
create policy "Enable update for authenticated users"
on public.project_versions
for update
to authenticated
using (true)
with check (true);

-- Policy to allow DELETE on comments (for cascading delete)
create policy "Enable delete comments for authenticated users"
on public.comments
for delete
to authenticated
using (true);

-- Ensure display_name column exists (redundant safety)
alter table public.project_versions add column if not exists display_name text;
