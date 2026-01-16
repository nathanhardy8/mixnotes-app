-- Allow reading files from 'projects' bucket
create policy "Allow read access for projects bucket"
on storage.objects
for select
to authenticated
using ( bucket_id = 'projects' );

-- Allow uploading files to 'projects' bucket
create policy "Allow upload access for projects bucket"
on storage.objects
for insert
to authenticated
with check ( bucket_id = 'projects' );

-- Allow deleting files from 'projects' bucket
create policy "Allow delete access for projects bucket"
on storage.objects
for delete
to authenticated
using ( bucket_id = 'projects' );

-- Note: Ensure 'projects' bucket is public if you want public URLs to work without signed URLs.
-- If bucket is private, you must use signed URLs or authenticated policies.
-- In this app, we use public URLs (v.audioUrl presumably).
