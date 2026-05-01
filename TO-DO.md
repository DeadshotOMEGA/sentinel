# Sentinel TODO + Branch/PR Plan

## Workflow Rules

- Use one branch per independent task.
- Use one PR per branch.
- Keep commits small and focused.
- Start each branch from latest `main` unless it depends on another in-progress branch.
- Use `change-notes` skill for all commit messages, PR descriptions, release notes, and changelog text.
- Use one status value per task: `todo | in_progress | blocked | implemented | verified`.
- `implemented` means Codex completed code changes, but functionality is not yet confirmed by the User.
- `verified` means the User has confirmed the implementation works as expected.
- Codex MUST NOT set a task directly to `verified` without explicit User confirmation.
- Each task card MUST include `- User verified: [ ]` (unchecked by default).
- After finishing code changes, Codex should set:
  - `Status: implemented`
  - `User verified: [ ]`
- Only after the User marks `User verified: [x]`, Codex may:
  - set `Status: verified`
  - clear/remove that completed task card from this file on the next TO-DO.md maintenance pass.
- Codex should check for any task cards with `Status: verified` and `User verified: [x]` whenever reading this file, and clear those sections.

## Task Cards (Codex-Ready)

### TODO-KIOSK-001: Kiosk offline scan sync

- Status: `implemented`
- User verified: [ ]
- Branch: `feature/kiosk-offline-scan-sync`
- Depends on: none
- PR goal: queue scans while offline and sync on reconnect.
- Target paths:
  - `apps/frontend-admin/src/components/kiosk/**`
  - `apps/frontend-admin/src/lib/**`
  - `apps/backend/src/routes/**`
  - `apps/backend/src/services/**`
  - `packages/contracts/**`
- Done when:
  - Kiosk continues accepting scans when backend is unavailable.
  - Offline scans are persisted and retried automatically on reconnect.
  - Replay logic is idempotent and does not create duplicate records.
  - User/operator receives clear sync state feedback (queued/syncing/synced/error).
  - Tests cover offline queueing, reconnect replay, and duplicate protection.
- Out of scope:
  - Replacing kiosk auth/session model.
  - Large redesign of kiosk screen layout unrelated to sync state.
- Commit slices:
  - `feat: add kiosk offline scan queue model`
  - `feat: persist queued scans and replay on reconnect`
  - `fix: prevent duplicate replay submissions`
  - `test: cover offline queue and reconnect sync flow`
- Codex prompt:
  - `Please implement TODO-KIOSK-001 from TO-DO.md end-to-end on branch feature/kiosk-offline-scan-sync, with clean logical commits and tests.`

### TODO-UX-001: Schedules page visual review/update

- Status: `todo`
- User verified: [ ]
- Branch: `ux/schedules-page-refresh`
- Depends on: none
- PR goal: improve readability and scan speed on schedules page.
- Target paths:
  - `apps/frontend-admin/src/components/**schedule*`
  - `apps/frontend-admin/src/app/**schedule*`
  - `apps/frontend-admin/src/styles/**`
- Done when:
  - Schedule hierarchy is visually clearer at a glance.
  - Key status/action signals are easier to scan.
  - No obvious layout regressions at desktop resolution (1920x1080).
  - Visual verification evidence is included in PR notes.
  - Relevant tests are updated/passing for changed behavior.
- Out of scope:
  - Backend schedule business-rule changes.
  - Broad redesign outside schedule-related screens.
- Commit slices:
  - `ux: improve schedules hierarchy and spacing`
  - `ux: clarify status colors and labels`
  - `test: update schedules UI expectations`
- Codex prompt:
  - `Please implement TODO-UX-001 from TO-DO.md on branch ux/schedules-page-refresh, following frontend AGENTS rules and including visual verification evidence.`

### TODO-REPORT-001: PDF report system foundation

- Status: `todo`
- User verified: [ ]
- Branch: `feature/pdf-reporting-foundation`
- Depends on: none
- PR goal: first end-to-end PDF report generation path.
- Target paths:
  - `apps/backend/src/routes/**`
  - `apps/backend/src/services/**`
  - `packages/contracts/**`
  - `apps/frontend-admin/src/**` (if UI trigger is included)
- Done when:
  - A report endpoint exists with validated request/response contract.
  - Backend can generate a baseline PDF for defined report inputs.
  - Initial template is production-safe and readable.
  - Error paths return actionable messages.
  - Tests cover successful generation and failure/validation cases.
- Out of scope:
  - Full report catalog/library.
  - Advanced styling/theming for every report type.
- Commit slices:
  - `feat: add report DTO and generation service`
  - `feat: add report endpoint and validation`
  - `feat: add initial report template`
  - `test: add PDF report API/service coverage`
- Codex prompt:
  - `Please implement TODO-REPORT-001 from TO-DO.md on branch feature/pdf-reporting-foundation, including API contracts, backend implementation, and test coverage.`

### TODO-VISITOR-001: Visitor group sign-in

- Status: `implemented`
- User verified: [ ]
- Branch: `feature/visitor-group-signin`
- Depends on: none
- PR goal: support multiple people and multiple vehicles per group.
- Target paths:
  - `apps/frontend-admin/src/components/kiosk/**visitor*`
  - `apps/backend/src/routes/**visitor*`
  - `apps/backend/src/services/**visitor*`
  - `packages/contracts/**`
  - `packages/database/prisma/**` (if schema changes are required)
- Done when:
  - Kiosk flow supports creating a visitor group with multiple people.
  - Kiosk flow supports adding multiple vehicles to the same group.
  - API/data model supports and persists grouped visitor records.
  - Validation and user messaging cover common mistakes.
  - Tests cover core happy path and key validation failures.
- Out of scope:
  - Group sign-out behavior (handled in TODO-VISITOR-002).
  - Major non-visitor kiosk flow changes.
- Commit slices:
  - `feat: extend visitor model for group members and vehicles`
  - `feat: add kiosk group sign-in flow`
  - `test: cover group sign-in happy/error paths`
- Codex prompt:
  - `Please implement TODO-VISITOR-001 from TO-DO.md on branch feature/visitor-group-signin, with schema/contract updates and kiosk flow tests.`

### TODO-VISITOR-002: Visitor group sign-out

- Status: `todo`
- User verified: [ ]
- Branch: `feature/visitor-group-signout`
- Depends on: `TODO-VISITOR-001`
- PR goal: allow full-group and partial-member sign-out from kiosk.
- Target paths:
  - `apps/frontend-admin/src/components/kiosk/**visitor*`
  - `apps/backend/src/routes/**visitor*`
  - `apps/backend/src/services/**visitor*`
  - `packages/contracts/**`
- Done when:
  - Kiosk shows active visitors/groups eligible for sign-out.
  - Operators/visitors can sign out an entire group in one action.
  - Operators/visitors can sign out selected members from a group.
  - Presence/check-out records stay accurate after partial sign-outs.
  - Tests cover full-group and partial-member sign-out paths.
- Out of scope:
  - Sign-in data model redesign beyond what sign-out requires.
  - Non-kiosk admin tooling expansion for visitor management.
- Commit slices:
  - `feat: add active visitor/group list on kiosk`
  - `feat: support partial group sign-out actions`
  - `test: cover full and partial sign-out flows`
- Codex prompt:
  - `Please implement TODO-VISITOR-002 from TO-DO.md on branch feature/visitor-group-signout, including full-group and partial-member sign-out behavior and tests.`

## Suggested PR Sequence

1. `feature/kiosk-offline-scan-sync`
2. `feature/visitor-group-signin`
3. `feature/visitor-group-signout`
4. `feature/pdf-reporting-foundation`
5. `ux/schedules-page-refresh`
