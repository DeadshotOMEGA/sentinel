# CLAUDE Rules: Future Plans

## Scope

Applies when creating or reviewing: `docs/plans/future/`

## Non-Negotiables (MUST / MUST NOT)

**Purpose**:

- MUST contain deferred work from completed plans
- MUST contain planned future enhancements
- MUST NOT contain active work (use `active/` for that)

**File Naming**:

- MUST use descriptive kebab-case names
- MUST NOT require date prefix (future work may not have fixed timeline)
- SHOULD include subject area (e.g., `observability-enhancements.md`)

**Dependencies**:

- MUST reference prerequisite work in `depends_on` frontmatter field
- MUST link to related completed plans

**Lifecycle State**:

- MUST set `lifecycle: future` in frontmatter
- MUST set `status: future` in frontmatter

**Required Frontmatter**:

- MUST include: type, title, status (future), lifecycle (future)
- MUST include: created, last_updated, priority, estimated_effort
- MUST include: depends_on (list of prerequisite plans/work)
- SHOULD include: ai metadata (triggers, priority, token_budget)

## Defaults (SHOULD)

**When to Create**:

- SHOULD create when deferring work from active plans
- SHOULD create for planned enhancements with clear value proposition
- SHOULD NOT create for vague ideas (use ADRs or discussions instead)

**Structure**:

- SHOULD include Executive Summary
- SHOULD break into phases with effort estimates
- SHOULD include cost considerations
- SHOULD define success criteria
- SHOULD prioritize items (HIGH/MEDIUM/LOW)

**Review**:

- SHOULD review quarterly to assess priority changes
- SHOULD update when prerequisites complete
- SHOULD move to `active/` when work begins

## Workflow

**When deferring work from active plan**:

1. Create future plan in `future/` directory
2. Reference in completed plan's "Future Enhancements" section
3. Set `depends_on` to point to completed plan
4. Include deferred items with context on why deferred

**When promoting future plan to active**:

1. Verify all dependencies in `depends_on` are complete
2. Update lifecycle: `future` → `active`
3. Add date prefix to filename: `YYYY-MM-DD-descriptive-title.md`
4. Move to `active/` directory
5. Update plan with specific timeline and assignees

**When future plan becomes obsolete**:

1. Update lifecycle: `future` → `archived`
2. Add archival reason to frontmatter
3. Keep in `future/` directory for reference

## Quick Reference

**Lifecycle Transitions**:

- `future` → `active` (when work starts, move to `active/` with date prefix)
- `future` → `archived` (when obsolete, keep in `future/`)
- `future` → `superseded` (when replaced by better plan)

**Priority Levels**:

- **HIGH**: Critical for production readiness or significant user value
- **MEDIUM**: Valuable but not blocking
- **LOW**: Nice-to-have enhancements

**Effort Estimates**:

- Use realistic time ranges (e.g., "2-3 weeks", "3-4 days")
- Include total effort across all phases
- Consider dependencies and unknowns

**Related**:

- [Active Plans](../active/CLAUDE.md) - Current work
- [Completed Plans](../completed/CLAUDE.md) - Finished work
- [Plans Index](../index.md) - All plans with status
