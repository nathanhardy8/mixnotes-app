-- Allow SELECT for project_versions
-- Without this, fetching the project will return empty versions array if RLS is on.
create policy "Enable read access for authenticated users"
on public.project_versions
for select
to authenticated
using (true);

-- Ensure Comments are also readable if I touched them
create policy "Enable read access for comments"
on public.comments
for select
to authenticated
using (true);
