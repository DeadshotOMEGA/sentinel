# Kiosk UX/UI Issue Backlog

Date: March 26, 2026

## Status Summary

| ID             | Severity | Status   | Opened  | Closed  | Summary                                                                        |
| -------------- | -------- | -------- | ------- | ------- | ------------------------------------------------------------------------------ |
| `KIOSK-UX-001` | High     | Fixed    | Cycle 1 | Cycle 1 | Primary member scan controls and live result lacked dominance.                 |
| `KIOSK-UX-002` | Medium   | Fixed    | Cycle 1 | Cycle 5 | Narrow layout placed visitor content ahead of the live result.                 |
| `KIOSK-UX-003` | High     | Fixed    | Cycle 1 | Cycle 2 | Responsibility overlay lacked full interruption strength and decision clarity. |
| `KIOSK-UX-004` | Medium   | Fixed    | Cycle 2 | Cycle 3 | Visitor flow hid the touch keyboard too long for kiosk use.                    |
| `KIOSK-UX-005` | Medium   | Fixed    | Cycle 2 | Cycle 4 | Kiosk shell framing and fullscreen prompt felt too generic.                    |
| `KIOSK-UX-006` | Low      | Deferred | Cycle 2 | -       | Dev-only Next.js chrome still appears in local Playwright captures.            |
| `KIOSK-UX-007` | Low      | Fixed    | Cycle 3 | Cycle 4 | Idle copy sounded passive instead of operational.                              |

## `KIOSK-UX-001`

- Severity: High
- Status: Fixed
- Opened: Cycle 1
- Closed: Cycle 1
- Problem: The badge input, visitor card, and response state were competing for equal visual weight.
- Evidence:
  - `test-results/kiosk-ux-review/cycle-01/pre/desktop-idle.yml`
  - `test-results/kiosk-ux-review/cycle-01/pre/narrow-idle.yml`
- Resolution:
  - Built a dominant member-flow card.
  - Enlarged the badge input and scan button.
  - Moved the live result into the primary surface.

## `KIOSK-UX-002`

- Severity: Medium
- Status: Fixed
- Opened: Cycle 1
- Closed: Cycle 5
- Problem: On narrower layouts, the visitor card appeared before the live result, weakening the scan workflow.
- Evidence:
  - `test-results/kiosk-ux-review/cycle-04/post/narrow-idle.yml`
- Resolution:
  - Reordered the hero content so narrow layout preserves `scan -> result -> visitor`.
- Verification:
  - `test-results/kiosk-ux-review/cycle-05/post/narrow-idle.yml`

## `KIOSK-UX-003`

- Severity: High
- Status: Fixed
- Opened: Cycle 1
- Closed: Cycle 2
- Problem: Responsibility prompts felt like a dense admin form rather than a hard kiosk interruption.
- Evidence:
  - `test-results/kiosk-ux-review/cycle-01/pre/desktop-responsibility.yml`
- Resolution:
  - Strengthened the backdrop.
  - Increased heading scale.
  - Made decisions and outcomes more explicit.
  - Added a current-selection summary and stronger action bar.
- Verification:
  - `test-results/kiosk-ux-review/cycle-02/post/desktop-responsibility.yml`

## `KIOSK-UX-004`

- Severity: Medium
- Status: Fixed
- Opened: Cycle 2
- Closed: Cycle 3
- Problem: Visitor self-sign-in required too much discovery before the touch keyboard became useful.
- Evidence:
  - `test-results/kiosk-ux-review/cycle-02/post/narrow-visitor.yml`
- Resolution:
  - Auto-activated the first editable field when entering details and purpose steps.
  - Updated the capture flow to verify the keyboard-forward kiosk behavior.
- Verification:
  - `test-results/kiosk-ux-review/cycle-03/post/narrow-visitor.yml`

## `KIOSK-UX-005`

- Severity: Medium
- Status: Fixed
- Opened: Cycle 2
- Closed: Cycle 4
- Problem: The kiosk shell framing and fullscreen hint felt too much like a normal app route.
- Evidence:
  - `test-results/kiosk-ux-review/cycle-02/post/desktop-idle.yml`
- Resolution:
  - Added a more appliance-like shell frame.
  - Refined the fullscreen prompt.
  - Improved the maintenance panel presentation.
- Verification:
  - `test-results/kiosk-ux-review/cycle-04/post/desktop-idle.yml`

## `KIOSK-UX-006`

- Severity: Low
- Status: Deferred
- Opened: Cycle 2
- Problem: A dev-only Next.js button still appears in local Playwright captures.
- Evidence:
  - `test-results/kiosk-ux-review/cycle-05/post/desktop-idle.yml`
  - `test-results/kiosk-ux-review/cycle-05/post/narrow-idle.yml`
- Notes:
  - This is local-development chrome, not kiosk product UI.
  - Route-level concealment improved the TanStack devtools bleed, but the Next.js button still renders in development.
  - Deferred because it is not part of the production kiosk contract.

## `KIOSK-UX-007`

- Severity: Low
- Status: Fixed
- Opened: Cycle 3
- Closed: Cycle 4
- Problem: The idle state copy was too passive and did not sound like an operational station.
- Evidence:
  - `test-results/kiosk-ux-review/cycle-03/post/desktop-idle.yml`
- Resolution:
  - Replaced the generic welcome copy with direct ready-state instructions.
- Verification:
  - `test-results/kiosk-ux-review/cycle-04/post/desktop-idle.yml`
