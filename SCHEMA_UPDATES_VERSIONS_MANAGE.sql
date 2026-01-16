-- Add display_order to project_versions
alter table public.project_versions
    add column if not exists display_order int default 0;

-- Optional: Create index on display_order
create index if not exists idx_project_versions_display_order on public.project_versions(project_id, display_order);
