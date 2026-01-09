-- Create Clients table
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  engineer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null
);

-- Enable RLS on clients
alter table public.clients enable row level security;

-- Policies for clients
create policy "Engineers can manage their own clients"
  on public.clients
  for all
  using (auth.uid() = engineer_id);

-- Add client_id to projects
alter table public.projects 
add column if not exists client_id uuid references public.clients(id) on delete set null;

-- Index for performance
create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_clients_engineer_id on public.clients(engineer_id);
