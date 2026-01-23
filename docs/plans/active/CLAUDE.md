# CLAUDE Rules: Active Plans

## Scope

Applies when creating or reviewing: `docs/plans/active/`

## Non-Negotiables (MUST / MUST NOT)

**File Naming**:

- MUST use date prefix: `YYYY-MM-DD-descriptive-title.md`
- MUST use kebab-case
- Exception: Living documents MAY omit date (e.g., `backend-rebuild-plan.md`)

**Lifecycle State**:

- MUST set `lifecycle: active` in frontmatter
- MUST set `status: active` in frontmatter
- MUST update `reviewed` date when reviewing plan

**Updates**:

- MUST update plan weekly with progress
- MUST mark completed phases with checkboxes
- MUST move to `completed/` when all phases done

## Defaults (SHOULD)

**Maintenance**:

- SHOULD review active plans weekly
- SHOULD update `last_updated` when making changes
- SHOULD log major updates at bottom of plan

**Transitions**:

- SHOULD move to `completed/` when finished
- SHOULD update index.md when plan state changes

## Workflow

**When plan becomes active**:

1. Move from `future/` or create new file
2. Add date prefix to filename (unless living document)
3. Set `lifecycle: active`, `status: active`
4. Update `docs/plans/index.md`

**When plan completes**:

1. Verify all phases are done
2. Set `lifecycle: completed`
3. Move file to `completed/` directory
4. Extract future work to `future/` if applicable
5. Update `docs/plans/index.md`

## Quick Reference

**Current Active Plans**:

- [Backend Rebuild Plan](backend-rebuild-plan.md) - Phase 3 in progress
