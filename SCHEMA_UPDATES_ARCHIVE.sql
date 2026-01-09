
-- Add archived_at to projects
alter table public.projects 
add column if not exists archived_at timestamptz;

-- Add archived_at to clients
alter table public.clients
add column if not exists archived_at timestamptz;

-- Optional: Create index if we filter by archived_at frequently
create index if not exists idx_projects_archived_at on public.projects(archived_at);
create index if not exists idx_clients_archived_at on public.clients(archived_at);
