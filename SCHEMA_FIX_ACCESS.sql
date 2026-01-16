-- RESTORE ENGINEER ACCESS
-- If RLS was enabled, we must explicitly allow Engineers to access their data.

-- Projects: Allow Engineers to do everything on their own projects
-- Note: Casting auth.uid() to text in case engineer_id is stored as text
CREATE POLICY "Enable access to own projects"
ON public.projects
FOR ALL
TO authenticated
USING (auth.uid()::text = engineer_id::text)
WITH CHECK (auth.uid()::text = engineer_id::text);

-- Project Versions: Allow Engineers to access versions of their projects
CREATE POLICY "Enable access to own project versions"
ON public.project_versions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_versions.project_id
    AND projects.engineer_id::text = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_versions.project_id
    AND projects.engineer_id::text = auth.uid()::text
  )
);
