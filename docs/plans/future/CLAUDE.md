# CLAUDE Rules: Future Plans

## Scope

Applies when creating or reviewing: `docs/plans/future/`

## Non-Negotiables (MUST / MUST NOT)

- MUST contain deferred work from completed plans or planned enhancements
- MUST NOT contain active work (use `active/` for that)
- MUST use descriptive kebab-case names (no date prefix)
- MUST set `lifecycle: future`, `status: future`
- MUST reference prerequisite work in `depends_on` field
- MUST include: type, title, status, created, last_updated, priority, estimated_effort
- MUST include: Executive Summary, phases with effort estimates, success criteria

## Defaults (SHOULD)

- SHOULD create when deferring work from active plans
- SHOULD review quarterly and update when prerequisites complete
- SHOULD move to `active/` when work begins

## Workflow

1. Create in `future/` directory with descriptive name
2. Set `depends_on` to point to prerequisite plans
3. When promoting to active: verify dependencies complete, add date prefix, move to `active/`, update timeline
