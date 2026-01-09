-- 1. Add archived_at column to comments table
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.comments.archived_at IS 'Timestamp when the comment was marked as completed/archived. Used for 24h auto-deletion.';

-- 2. Create cleanup function
CREATE OR REPLACE FUNCTION delete_old_archived_comments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.comments
  WHERE is_completed = true
    AND archived_at IS NOT NULL
    AND archived_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- 3. (Optional) Try to schedule with pg_cron if enabled
-- Check if pg_cron is available first?
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('0 * * * *', 'SELECT delete_old_archived_comments()');
