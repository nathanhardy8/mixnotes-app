-- 1. Revision Rounds Table
create table if not exists public.revision_rounds (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    project_version_id uuid references public.project_versions(id) on delete cascade not null,
    title text,
    status text default 'draft' check (status in ('draft', 'submitted', 'acknowledged', 'completed')),
    
    -- Attribution matching Comment style
    author_type text check (author_type in ('ENGINEER', 'CLIENT')),
    author_id text, -- Can be User ID or Client Access Token ID or Cookie ID
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    submitted_at timestamptz,
    completed_at timestamptz
);

create index if not exists idx_revision_rounds_version on public.revision_rounds(project_version_id);
create index if not exists idx_revision_rounds_project on public.revision_rounds(project_id);

-- 2. Add review_status to project_versions
alter table public.project_versions 
add column if not exists review_status text default 'in_review' check (review_status in ('draft', 'in_review', 'changes_requested', 'approved'));

-- 3. Add fields to comments
alter table public.comments
add column if not exists status text default 'open' check (status in ('open', 'resolved')),
add column if not exists needs_clarification boolean default false,
add column if not exists revision_round_id uuid references public.revision_rounds(id) on delete set null;

create index if not exists idx_comments_revision_round on public.comments(revision_round_id);

-- 4. RLS Policies (Simple additive)
-- Ensure read/write access follows project access.

-- RLS for revision_rounds
alter table public.revision_rounds enable row level security;

-- Policy: Authenticated Engineers can view rounds for their projects
create policy "Engineers can view rounds for their projects"
on public.revision_rounds for select
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = revision_rounds.project_id
        and projects.engineer_id = auth.uid()
    )
);

-- Policy: Engineers can insert/update/delete rounds (Full control)
create policy "Engineers can manage rounds"
on public.revision_rounds for all
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = revision_rounds.project_id
        and projects.engineer_id = auth.uid()
    )
);

-- Policy: Public/Shared Access (Review Links)
-- Assuming we use a similar pattern to comments where if you have the token you can access.
-- Using 'public' role or specific logic.
-- For now, allowing public SELECT/INSERT if they have access to the project (via application logic usually, but here RLS needs to be permissive for guests if they assume anonymous role).
-- If 'anon' is used for guests:

create policy "Anonymous can view rounds with project access"
on public.revision_rounds for select
to anon
using (true); -- Application controls access via Token validation in API

create policy "Anonymous can insert rounds"
on public.revision_rounds for insert
to anon
with check (true);

create policy "Anonymous can update own rounds"
on public.revision_rounds for update
to anon
using (true);
