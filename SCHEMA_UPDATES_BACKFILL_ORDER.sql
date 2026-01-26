-- Backfill display_order based on created_at ASC
-- This ensures V1 is 0, V2 is 1, etc.

WITH ranked_versions AS (
  SELECT 
    id, 
    project_id, 
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) - 1 as new_order
  FROM project_versions
)
UPDATE project_versions
SET display_order = ranked_versions.new_order
FROM ranked_versions
WHERE project_versions.id = ranked_versions.id;
