-- SCHEMA_UPDATES_CLIENT_UPLOADS.sql

-- 1. Client Access Tokens (for Magic Links to Client Folder)
create table if not exists public.client_access_tokens (
    id uuid default gen_random_uuid() primary key,
    client_id uuid not null references public.clients(id) on delete cascade,
    token_hash text not null,
    expires_at timestamptz default (now() + interval '90 days'),
    last_used_at timestamptz,
    created_at timestamptz default now() not null,
    created_by_user_id uuid references auth.users(id),
    revoked_at timestamptz
);

create index if not exists idx_client_tokens_hash on public.client_access_tokens(token_hash);
create index if not exists idx_client_tokens_client_id on public.client_access_tokens(client_id);

-- 2. Client Uploaded Files
create table if not exists public.client_uploaded_files (
    id uuid default gen_random_uuid() primary key,
    client_id uuid not null references public.clients(id) on delete cascade,
    uploaded_by_type text default 'CLIENT', -- 'CLIENT', 'PRODUCER'
    uploaded_by_identifier text, -- token ID (if client) or user UUID (if producer)
    original_filename text not null,
    display_name text not null,
    storage_key text not null,
    mime_type text,
    size_bytes bigint,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted_at timestamptz
);

create index if not exists idx_client_uploads_client_id on public.client_uploaded_files(client_id);

-- 3. Update Clients Table
alter table public.clients 
    add column if not exists upload_instructions text,
    add column if not exists access_public_id text unique default gen_random_uuid()::text;

-- 4. Storage Bucket (Logic to be run in Dashboard/SQL Editor usually, but verifying structure here)
-- We assume a bucket 'client-uploads' exists.
-- insert into storage.buckets (id, name, public) values ('client-uploads', 'client-uploads', false) on conflict do nothing;

-- 5. RLS Policies (Draft - needs to be applied in Supabase dashboard or migration if managed there)
-- Enable RLS
alter table public.client_uploaded_files enable row level security;
alter table public.client_access_tokens enable row level security;

-- Producer Access: Can do everything
-- create policy "Producers can view all uploads" on public.client_uploaded_files for all using ( auth.role() = 'authenticated' ); -- Simplified for now
-- create policy "Producers can manage tokens" on public.client_access_tokens for all using ( auth.role() = 'authenticated' );
