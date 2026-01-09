
-- Add size_bytes to projects table for storage usage tracking
alter table public.projects 
add column if not exists size_bytes bigint default 0;

-- Optional: index if we query sum heavily, though usually we sum by user/engineer
-- Actually we might want sum by engineer_id. 
-- For now, no index needed on size_bytes itself.
