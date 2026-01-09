-- SCHEMA_UPDATES_REVIEW.sql

-- 1. Create Approval Status Enum
DO $$ BEGIN
    CREATE TYPE public.approval_status AS ENUM ('PENDING', 'APPROVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Modify Projects Table
alter table public.projects
    add column if not exists review_public_id text unique,
    add column if not exists review_enabled boolean default false,
    add column if not exists client_name text,
    add column if not exists client_email text,
    add column if not exists client_phone text,
    add column if not exists revision_limit int, -- null = unlimited
    add column if not exists revisions_used int default 0,
    add column if not exists approval_status public.approval_status default 'PENDING',
    add column if not exists approved_at timestamptz,
    add column if not exists approved_by text,
    add column if not exists reminders_enabled boolean default true,
    add column if not exists reminder_schedule_json jsonb,
    add column if not exists last_client_activity_at timestamptz,
    add column if not exists last_reminder_sent_at timestamptz,
    add column if not exists reminder_stage int default 0;

create index if not exists idx_projects_review_public_id on public.projects(review_public_id);
create index if not exists idx_projects_reminders on public.projects(review_enabled, approval_status, last_client_activity_at);

-- 3. Project Versions Table
create table if not exists public.project_versions (
    id uuid default gen_random_uuid() primary key,
    project_id uuid not null references public.projects(id) on delete cascade,
    version_number int not null,
    audio_asset_id uuid, -- For now, we might link to a storage asset ID or just use audio_url in logic
    audio_url text, -- Store URL explicitly for version history
    created_at timestamptz default now() not null,
    created_by_user_id uuid references auth.users(id),
    is_approved boolean default false
);

create index if not exists idx_project_versions_project_id on public.project_versions(project_id);
create index if not exists idx_project_versions_version_no on public.project_versions(project_id, version_number);

-- Add approved_version_id to projects (circular dependency handling: nullable FK)
alter table public.projects
    add column if not exists approved_version_id uuid references public.project_versions(id);

-- 4. Review Magic Links Table
create table if not exists public.review_magic_links (
    id uuid default gen_random_uuid() primary key,
    project_id uuid not null references public.projects(id) on delete cascade,
    token_hash text not null,
    expires_at timestamptz default (now() + interval '30 days'),
    last_used_at timestamptz,
    created_at timestamptz default now() not null,
    created_by_user_id uuid references auth.users(id),
    revoked_at timestamptz,
    max_uses int -- null = unlimited
);

create index if not exists idx_magic_links_token_hash on public.review_magic_links(token_hash);
create index if not exists idx_magic_links_project_id on public.review_magic_links(project_id);

-- 5. Review Reminder Log
create table if not exists public.review_reminder_log (
    id uuid default gen_random_uuid() primary key,
    project_id uuid not null references public.projects(id) on delete cascade,
    sent_via text check (sent_via in ('EMAIL', 'SMS')),
    sent_to text,
    stage int,
    sent_at timestamptz default now(),
    provider_message_id text,
    status text check (status in ('SENT', 'FAILED')),
    error text
);

create index if not exists idx_reminder_log_project_id on public.review_reminder_log(project_id);

-- 6. Modify Comments Table
alter table public.comments
    add column if not exists project_version_id uuid references public.project_versions(id),
    add column if not exists is_post_approval boolean default false;

create index if not exists idx_comments_project_version_id on public.comments(project_version_id);
