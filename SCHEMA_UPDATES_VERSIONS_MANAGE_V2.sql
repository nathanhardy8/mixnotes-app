-- Add display_name to project_versions
alter table public.project_versions
    add column if not exists display_name text;
