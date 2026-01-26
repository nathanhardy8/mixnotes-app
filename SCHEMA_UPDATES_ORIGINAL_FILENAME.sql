-- Add original_filename to project_versions
ALTER TABLE public.project_versions
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Backfill logic is tricky without source data, leaving NULL as per requirements
-- But if audio_url contains the filename, we could try to extract it?
-- URL format: .../projects/timestamp-random.ext
-- Not reliable to get the *original* name from the generated unique name.
-- So we leave existing rows as NULL.
