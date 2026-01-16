-- make the 'projects' bucket public
update storage.buckets
set public = true
where id = 'projects';

-- Allow public (anonymous) read access for 'projects' bucket
create policy "Allow public read access"
on storage.objects
for select
to public
using ( bucket_id = 'projects' );

-- If the above fails because policy exists, it's fine.
-- Ensuring Authentication policies still exist (created in previous step) for insert/delete.
