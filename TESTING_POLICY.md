# AntiGravity Testing & Preview Policy

## Objective
Prevent AntiGravity from changing, hijacking, or redirecting the active computer window or browser tab during any testing, preview, or simulation runs.

## Hard Requirements

### 1. No Window Focus Changes
- **Do NOT** auto-switch browser tabs.
- **Do NOT** bring preview windows to the foreground.
- **Do NOT** resize, reposition, or open new windows.
- **Do NOT** force full-screen, split-screen, or modal focus.

### 2. Background-Only Execution
- All tests, previews, and simulations must run in the **background**.
- If a preview is required, generate a **background URL** or log-only reference instead of opening it automatically.
- The user must manually choose if/when to open any preview.

### 3. Testing Mode Configuration
- All testing tools must default to a **"headless" or "silent" mode**:
  - No UI takeovers.
  - No focus stealing.
  - No OS-level window management.
- Preserve the user’s current working context at all times.

### 4. Logging Instead of Redirecting
- Output test results, diffs, and errors via:
  - Console logs
  - In-app status messages
  - Non-intrusive notifications (no forced navigation)

### 5. Respect User Settings
- Do not override browser, OS, or AntiGravity default window behavior unless explicitly requested.
- This behavior is **persistent** and defaults to "No Focus Stealing".

## Implementation Guide for Future Tests
When adding new test frameworks (e.g., Playwright, Cypress):
- **ALWAYS** set `headless: true` in the configuration.
- **NEVER** add scripts that use `open` or `start` with auto-open flags.
- **ALWAYS** output URLs to stdout rather than opening them.
