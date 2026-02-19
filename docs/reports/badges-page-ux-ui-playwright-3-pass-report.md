# Badges Page UX/UI Review (Playwright, 3 Desktop Passes)

Date: 2026-02-19
Scope: `apps/frontend-admin/src/app/badges/page.tsx` and related badge components.
Method: Three iterative Playwright review/fix passes on desktop viewport, with screenshots captured under `screenshots/badges-ux/`.

Note: A mobile check was started early in the process, but per user direction this effort was constrained to desktop-only UX/UI improvements. Mobile-specific implementation changes were removed.

## Pass 1 - Baseline Review and Core Fixes

### Findings

1. `Last Used` often showed `Never` even for badges with check-in history, reducing trust in the table data.
2. Badge form member options were not in requested personnel format and were hard to scan in long lists.
3. Assigning a member required scrolling a large select list with no quick name filtering.
4. Duplicate hidden badge form instances in DOM created selector ambiguity and increased accessibility/automation friction.

### Changes implemented

1. Fixed badge repository detail mapping so `lastUsed` is populated from latest check-in timestamp when available.
2. Updated member display format in assignment options to `[Rank] [Last Name], [First Name]`.
3. Added member-name filter input in badge assignment flow; list now filters and sorts by last/first name.
4. Rendered create/edit badge modals conditionally when open to avoid duplicate hidden form instances.

### Why

- This resolves incorrect/empty operational data, improves assignment speed, and reduces interaction ambiguity for users and test tooling.

## Pass 2 - Desktop Scannability and Clarity

### Findings

1. Dense table rows made long lists visually fatiguing to scan.
2. Empty search/filter state lacked actionable guidance.
3. Edit/Delete icon buttons lacked explicit affordance text.
4. Pagination metadata lacked range context (how many rows currently shown).
5. Badge modal disabled-submit state was not self-explanatory when required fields were missing.

### Changes implemented

1. Added zebra striping to badges table for faster row tracking.
2. Improved empty state copy with actionable guidance: “Try adjusting your search or filters.”
3. Added `title` + `aria-label` metadata to row action buttons with badge context.
4. Added “Showing X-Y” pagination context beside total count/page.
5. Added inline helper text in badge form for missing serial number and missing assigned member requirements.

### Why

- These changes reduce cognitive load and make state/intent clearer without changing business logic.

## Pass 3 - Final Desktop Polish

### Findings

1. With long badge lists, header context is lost during vertical scroll.

### Changes implemented

1. Made the badges table header sticky within the table container.

### Why

- Preserves column context while scanning long datasets, improving speed and reducing mistakes.

## Final Change Summary (What Changed and Why)

### Data correctness

- `lastUsed` now reflects latest check-in activity in badge detail queries.
- Why: Operational timestamps must be trustworthy for badge management decisions.

### Assignment workflow usability

- Added member name filter input.
- Updated member option format to `[Rank] [Last Name], [First Name]`.
- Added inline helper validation text in form.
- Why: Faster selection, clearer save requirements, better alignment with staff naming conventions.

### Table clarity and efficiency

- Added zebra striping.
- Added sticky header.
- Added “Showing X-Y” range indicator.
- Improved empty-state guidance.
- Added explicit action button labels/titles.
- Why: Better readability and safer editing/deleting in large datasets.

### Interaction robustness

- Badge form modals are conditionally mounted when open.
- Why: Prevents duplicate hidden controls, reducing UI ambiguity and automation/accessibility conflicts.

## Primary files updated

- `apps/backend/src/repositories/badge-repository.ts`
- `apps/frontend-admin/src/app/badges/page.tsx`
- `apps/frontend-admin/src/components/badges/badges-table.tsx`
- `apps/frontend-admin/src/components/badges/badge-form-modal.tsx`
- `apps/frontend-admin/src/lib/test-ids.ts`

## Evidence artifacts

- Pass 1 captures: `screenshots/badges-ux/run1/`
- Pass 2 captures: `screenshots/badges-ux/run2-desktop/`
- Pass 3 captures: `screenshots/badges-ux/run3-desktop/`
