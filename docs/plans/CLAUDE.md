# CLAUDE Rules: Implementation Plans

## Scope

Applies when creating documentation in: `docs/plans/`

## Non-Negotiables (MUST / MUST NOT)

- MUST use date prefix: `YYYY-MM-DD-descriptive-title.md` (except living docs)
- MUST use kebab-case
- MUST place active plans in `active/`, completed in `completed/`, future in `future/`
- MUST set lifecycle (draft, active, completed, archived, superseded, future)
- MUST include: type, title, status, created, last_updated, lifecycle, reviewed
- MUST include: Executive Summary, Goals, Implementation Phases, Success Metrics
- MUST use checkbox tasks in phases with measurable criteria
- MUST add `superseded_by` link when superseded
- MUST add `depends_on` for future plans

## Defaults (SHOULD)

- SHOULD create for work spanning 3+ steps or > 1 week
- SHOULD review active plans weekly, update `reviewed` date
- SHOULD link to related ADRs and RFCs

## Workflow

1. Copy template from `@docs/templates/plan.md`
2. Use today's date in filename (unless living document)
3. Set `lifecycle: draft`, `status: draft`
4. When approved: Set `lifecycle: active`, move to `active/`
5. When done: Set `lifecycle: completed`, move to `completed/`
