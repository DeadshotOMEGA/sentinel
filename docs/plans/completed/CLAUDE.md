# CLAUDE Rules: Completed Plans

## Scope

Applies when reviewing: `docs/plans/completed/`

## Non-Negotiables (MUST / MUST NOT)

**Immutability**:

- MUST NOT edit completed plans (historical record)
- MUST NOT change file content after completion
- Exception: MAY add `superseded_by` link if new plan replaces

**File Naming**:

- MUST use date prefix: `YYYY-MM-DD-descriptive-title.md`
- MUST use completion date (or original creation date)
- MUST use kebab-case

**Lifecycle State**:

- MUST have `lifecycle: completed` in frontmatter
- MUST have `status: completed` in frontmatter

## Defaults (SHOULD)

**Organization**:

- SHOULD maintain chronological order
- SHOULD cross-reference from related active/future plans
- SHOULD link to resulting code and documentation

**Future Work**:

- SHOULD extract deferred items to `future/` plans
- SHOULD reference future plans in "Future Enhancements" section

## Workflow

**When plan moves to completed**:

1. Verify all phases are marked complete
2. Set `lifecycle: completed`
3. Move file from `active/` to `completed/`
4. Extract any deferred work to `future/` plan
5. Update `docs/plans/index.md`

**When referencing completed plan**:

1. Link to completed plan for context
2. Use `depends_on` in future plans
3. Reference in ADRs for decision context

## Quick Reference

**Purpose**: Historical record of completed implementation plans

**File Pattern**: `YYYY-MM-DD-descriptive-title.md`

**Completed Plans**:

- [AI-First Documentation System](2026-01-19-ai-first-documentation-system.md)
- [Better Auth Plugin Integration](2026-01-19-better-auth-plugin-integration.md)
- [CLAUDE.md Refactoring](2026-01-20-claude-md-refactoring.md)
- [Observability Stack Implementation](2026-01-22-observability-stack-implementation.md)
- [Backend Rebuild](backend-rebuild-plan.md)
- [Backend Phase 4 Completion](2026-01-23-phase-4-completion.md)
- [Frontend Admin MVP](2026-01-23-frontend-admin-mvp.md)
- [Duty Roles & Lockup System](2026-01-27-duty-roles-lockup-system.md)
