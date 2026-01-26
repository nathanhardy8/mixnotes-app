# Task: Implement Client Version Visibility Control

## Database
- [ ] Create migration to add `client_version_visibility` column to `projects` table (text, default 'all').

## Backend (projectService.ts)
- [ ] Update `getProjects` / `getProjectById` to return this new field.
- [ ] Update `updateProject` to allow modifying this field.
- [ ] Update `getProjectByShareToken` to ENFORCE visibility rules:
    - If `client_version_visibility` is 'latest', return only the latest version (by display order/created at).

## Frontend (ProjectView.tsx)
- [ ] Update `Project` interface type.
- [ ] Add Toggle in Engineer Controls section:
    - "Client can view all versions" (Checked = 'all', Unchecked = 'latest').
- [ ] Add Helper Text:
    - If 'latest', show "Client will see: Version X — Filename...".
- [ ] Enforce visibility in "Client View" mode (Simulated):
    - In `ProjectView`, if `viewMode === 'client'` and setting is 'latest', locally filter versions passed to children.

## Verification
- [x] Verify Schema migration.
- [x] Verify Toggle persistence.
- [x] Verify "Client View" toggle hides older versions.
- [x] Verify Share Token access (if testable) hides older versions.
