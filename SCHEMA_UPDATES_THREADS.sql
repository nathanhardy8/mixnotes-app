-- 1. Add parent_id for threading (Self-referencing Foreign Key)
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_id UUID DEFAULT NULL REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Add updated_at for tracking edits
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.comments.parent_id IS 'ID of the parent comment if this is a reply.';
COMMENT ON COLUMN public.comments.updated_at IS 'Timestamp of the last edit.';
