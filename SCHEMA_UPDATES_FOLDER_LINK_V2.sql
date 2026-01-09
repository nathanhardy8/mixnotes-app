-- 1. Add Folder Link columns to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS folder_link_version INTEGER DEFAULT 1;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS folder_link_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS folder_link_last_used_at TIMESTAMPTZ;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS review_public_id UUID DEFAULT gen_random_uuid(); -- Ensure unique public ID for folder

-- 2. Drop the old table if it exists (cleanup)
DROP TABLE IF EXISTS public.folder_magic_links;
