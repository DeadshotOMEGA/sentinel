# CLAUDE Rules: Implementation Plans

## Scope

Applies when creating documentation in: `docs/plans/`

## Non-Negotiables (MUST / MUST NOT)

**File Naming**:

- MUST use date prefix: `YYYY-MM-DD-descriptive-title.md`
- MUST use kebab-case
- Exception: Living documents MAY omit date (e.g., `backend-rebuild-plan.md`)

**Directory Structure**:

- MUST place active plans in `active/` subdirectory
- MUST move completed plans to `completed/` subdirectory
- MUST place future/deferred plans in `future/` subdirectory
- MUST update `index.md` when plans change state

**Lifecycle States**:

- MUST use one of: draft, active, completed, archived, superseded, future
- MUST update `lifecycle` field in frontmatter when state changes
- MUST add `superseded_by` link when plan superseded
- MUST add `depends_on` link for future plans that depend on completed work

**Required Frontmatter**:

- MUST include: type, title, status, created, last_updated
- MUST include: lifecycle, reviewed, related_code
- MUST include AI metadata (priority, triggers, token_budget)

**Structure**:

- MUST include: Executive Summary, Goals, Implementation Phases, Success Metrics
- MUST use checkbox tasks in phases
- MUST define measurable success criteria

## Defaults (SHOULD)

**When to Create**:

- SHOULD create for work spanning 3+ steps or multiple systems
- SHOULD create for timeline > 1 week
- SHOULD NOT create for single-file changes or < 1 day work

**Updates**:

- SHOULD review active plans weekly
- SHOULD update `reviewed` date in frontmatter
- SHOULD log major updates at bottom of plan
- SHOULD mark plans stale if `reviewed` > 90 days

**Organization**:

- SHOULD maintain index.md with all plans and status
- SHOULD use `expires` field for staleness tracking
- SHOULD link to related ADRs and RFCs

## Workflow

**When creating plan**:

1. Copy template from `@docs/templates/plan.md`
2. Use today's date in filename (unless living document)
3. Set `lifecycle: draft`, `status: draft`
4. Fill in all required sections with specific, measurable goals
5. Break into phases with clear deliverables
6. When approved: Set `lifecycle: active`, move to `active/` directory
7. Update weekly with progress
8. When done: Set `lifecycle: completed`, move to `completed/` directory

**State transitions**:

- draft → active (user approves, move to `active/`)
- active → completed (all phases done, move to `completed/`)
- active → archived (cancelled/obsolete)
- active → superseded (new plan replaces, add `superseded_by` link)

## Quick Reference

**Lifecycle States**:

- **draft** - Being written, not approved
- **active** - Currently executing (in `active/` directory)
- **completed** - Finished (in `completed/` directory)
- **future** - Deferred/planned work (in `future/` directory)
- **archived** - Cancelled or no longer relevant
- **superseded** - Replaced by newer plan

**Required Sections**:

1. Executive Summary (one paragraph)
2. Goals (measurable) / Non-Goals
3. Implementation Phases (with checkboxes)
4. Success Metrics
5. Risks & Mitigations

**Related**:

- [Plan Template](../templates/plan.md)
- [ADRs](../decisions/adr/CLAUDE.md) - Plans reference ADRs
- [RFCs](../decisions/rfc/CLAUDE.md) - RFCs lead to plans
- [Plans Index](index.md) - All plans with status
