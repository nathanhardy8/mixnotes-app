-- Add allow_download column to projects table
-- Default to false so existing projects don't accidentally expose downloads if that was the intent,
-- though the request implies "only available IF the engineer toggles the allow downloads on".

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT false;

-- Comment on column
COMMENT ON COLUMN public.projects.allow_download IS 'If true, clients can download the audio file.';
