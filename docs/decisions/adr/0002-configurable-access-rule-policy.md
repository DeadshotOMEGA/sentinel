---
type: adr
title: 'Configurable Access Rule Policy'
status: accepted
created: 2026-06-24
decided: 2026-06-24
ai:
  priority: high
  context_load: always
  triggers:
    - access rules
    - account levels
    - authorization
    - permissions
    - settings
  token_budget: 1500
decision_makers:
  - Sentinel project owner
stakeholders:
  - Unit staff
  - Developers
  - Members
related_adrs: []
supersedes: null
superseded_by: null
---

# ADR-0002: Configurable Access Rule Policy

**Status:** Accepted

**Date:** 2026-06-24

**Decision Makers:** Sentinel project owner

---

## Context

Sentinel currently ties member authority to hard-coded Account Level checks spread across backend routes, frontend navigation, settings panels, dashboard actions, lockup workflows, reports, logs, and other operational surfaces. That makes future access-policy changes require code changes, which is a maintainability risk after the original developer is no longer available.

The desired model is for future maintainers to adjust which Account Level is required for Sentinel workflows without editing application code, while preserving backend enforcement and recovery safety.

Key factors:

- Account Levels remain a hierarchy from Basic through Developer.
- Account Level names and numeric order remain fixed for the first Access Rules release.
- Sentinel Bootstrap and other internal-only system identities are excluded from the configurable Access Rule model.
- Access-policy changes must affect both UI visibility and actual backend authority.
- The configurable surface must not allow accidental privilege escalation or total lockout.
- Current behavior should remain unchanged until a Developer intentionally changes a rule.

## Decision

Sentinel will use a fixed, Sentinel-defined Access Rule catalog with configurable minimum Account Levels stored as dedicated database records.

In short: application code defines what Access Rules exist and their safety floors; the database stores the active required Account Level for each rule.

Specifically:

- Each Access Rule has a stable key, built-in default Account Level, and non-configurable safety floor.
- Page visibility and page actions may use separate Access Rules even when their built-in defaults are the same.
- Each Access Rule stores its configured minimum Account Level in a dedicated table rather than in a generic settings blob.
- Missing Access Rule records are created from the built-in catalog while existing configured levels are preserved.
- Database records for Access Rules no longer present in the built-in catalog are marked retired or unknown for review rather than deleted automatically.
- Backend authorization is the source of truth and applies Access Rule changes immediately.
- Frontend navigation and controls use the same Access Rules for visibility.
- Ordinary clients receive the signed-in Member's allowed Access Rule keys; full policy metadata is fetched only for Access Rule management.
- Access Rules are grouped by operational area and may split view, manage, destructive, export, recovery, and authority-assignment actions.
- The v1 catalog includes Members & Personnel rules for viewing, hidden/all scopes, sensitive fields, create/edit/archive, imports, ordinary account-level assignment, Developer assignment, qualifications, and tags.
- The v1 catalog includes Badges & Temporary Personnel rules for badge viewing, registration, member assignment, status/custody changes, archival actions, temporary assignment management, temporary tag assignment, and tag recovery.
- The v1 catalog includes Dashboard & Presence rules for dashboard visibility, occupancy visibility, manual checkout, bulk checkout, history viewing, history correction, security alert visibility, and security alert acknowledgement.
- The v1 catalog includes Lockup & Duty Responsibility rules for lockup status/history, open/acquire/transfer/execute actions, admin override, DDS visibility, DDS administrative assignment, DDS self-acceptance, and DDS audit visibility.
- The v1 catalog includes Reports & Logs rules for operational report viewing/printing, audit log visibility, runtime log visibility/management, and Access Rules report printing.
- The v1 catalog includes Admin Settings & Configuration rules for Admin Control Centre visibility, configuration viewing, member/list/type/qualification/tag/event/holiday/timing/display management, Access Rule viewing, Access Rule editing, and bulk Access Rule editing.
- The v1 catalog includes System & Infrastructure rules for system health, updates, network state/management, remote systems, database viewing/export, backups, kiosk status, and kiosk/device management.
- Live WebSocket subscriptions use the same Access Rules as their matching pages or feature actions.
- Access Rule keys and labels are fixed by the built-in catalog; Developers may edit local descriptions only, with both built-in and local descriptions shown when they differ.
- Access Rule keys use a stable dotted naming convention and should not be changed casually.
- Missing or invalid configured rules fall back to built-in defaults and raise an operational warning.
- The Access Rule that governs Access Rule management remains Developer-floor.
- Access Rule changes are audited governance changes.
- Access Rule local description changes are audited governance changes.
- Bulk Access Rule editing is allowed, but must present a review step and write per-rule audit entries for every changed rule.
- Bulk changes and threshold-lowering changes require a reason note.
- Developers can produce a printable Access Rules report showing current policy, defaults, floors, default differences, and recent change history.

## Options Considered

### Option 1: Dedicated Access Rule records

Description: Store one database record per Access Rule key, with configured minimum level and update metadata.

Pros:

- Enables per-rule validation, auditing, and operational visibility.
- Avoids corrupting the whole policy through one malformed JSON value.
- Makes migration and reconciliation against the built-in catalog explicit.
- Gives future maintainers a clear policy model.

Cons:

- Requires schema, repository, contract, API, and UI work.
- Requires catalog reconciliation when code adds or removes Access Rules.

Why chosen: This best matches the governance importance of access policy and gives Sentinel a durable authorization model.

### Option 2: Generic settings JSON

Description: Store all configurable Access Rule thresholds as one JSON value in the existing settings system.

Pros:

- Smaller initial implementation.
- Reuses existing settings APIs and persistence.

Cons:

- Harder to validate and audit per Access Rule.
- Easier to corrupt with malformed or partial JSON.
- Awkward to reconcile safely with a fixed built-in rule catalog.
- Makes access policy look like ordinary application configuration.

Why not chosen: Access policy is a governance concern, not a generic setting.

### Option 3: Keep hard-coded Account Level checks

Description: Continue requiring code changes for every access-policy adjustment.

Pros:

- No immediate migration or UI work.
- Very explicit in code.

Cons:

- Future maintainers cannot adjust access thresholds without development support.
- Frontend and backend checks can continue drifting.
- Hard-coded checks are difficult to review as one coherent policy.

Why not chosen: It fails the succession and maintainability need that motivated the change.

## Consequences

Positive consequences:

- Future Developers can adjust Sentinel access thresholds from the application.
- Backend and frontend can share one access-policy model.
- Access-policy changes become visible and auditable.
- Existing behavior can be preserved through built-in defaults and migration.

Negative consequences:

- Authorization checks must move through an Access Rule service instead of direct numeric comparisons.
- Implementation must audit and replace direct human-workflow Account Level checks, except documented internal/system-only cases.
- Rule catalog changes require reconciliation logic.
- The UI must explain rule floors and inherited Account Levels clearly enough to prevent mistaken changes.

Risks and mitigations:

| Risk                                              | Probability | Impact | Mitigation                                                                                                    |
| ------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| A rule is lowered too far                         | Medium      | High   | Enforce non-configurable Access Rule floors.                                                                  |
| A bad migration removes access                    | Low         | High   | Fall back to built-in defaults and raise an operational warning.                                              |
| Frontend visibility drifts from backend authority | Medium      | Medium | Use the same Access Rule keys for UI visibility and backend enforcement.                                      |
| Last Developer is removed                         | Low         | High   | Preserve at least one active Developer-level Member.                                                          |
| Removed catalog rules lose policy history         | Medium      | Medium | Mark unknown rules retired for review rather than deleting them automatically.                                |
| Bulk editing changes too much at once             | Medium      | High   | Require a review step grouped by access expansion and restriction, then audit each changed rule individually. |
| Future staff cannot explain why access expanded   | Medium      | Medium | Require a reason note for bulk changes and threshold-lowering changes.                                        |
