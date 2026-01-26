# Consolidate Engineer Controls

## Goal
Refine the UI by removing the divider line between the "Downloads" toggle and the "Download File" button.

## Proposed Changes

### Component
#### [MODIFY] [src/components/ProjectView.tsx](file:///Users/nathanhardy/Documents/Antigravity/src/components/ProjectView.tsx)
- **Downloads Toggle Row**: Remove `borderBottom: '1px solid var(--surface-active)'` from the inline style of the `controlRow` div.
- Ensure the button container (which follows) retains its border bottom to separate the "Downloads" section from "Version Visibility".

## Verification
- Browser check:
  - Verify "Downloads" toggle and button appear as a single block without a line between them.
  - Verify there is still a line *after* the download button, separating it from the Version Visibility section.

