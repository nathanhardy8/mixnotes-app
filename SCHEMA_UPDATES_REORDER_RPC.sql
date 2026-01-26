-- Function to reorder project versions atomically
-- This prevents race conditions where realtime listeners fetch partial updates
-- Usage: supabase.rpc('reorder_project_versions', { p_project_id: '...', p_version_ids: ['...'] })

create or replace function reorder_project_versions(
  p_project_id uuid,
  p_version_ids uuid[]
)
returns void
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_index integer;
begin
  -- Simple update loop
  v_index := 0;
  foreach v_id in array p_version_ids
  loop
    update project_versions
    set display_order = v_index
    where id = v_id and project_id = p_project_id;
    
    v_index := v_index + 1;
  end loop;
end;
$$;
