# CLAUDE Rules: Session Reports

## Scope
Applies when creating documentation in: `docs/sessions/`

## Non-Negotiables (MUST / MUST NOT)

**File Naming**:
- MUST use date prefix: `YYYY-MM-DD-session-description.md`
- MUST use session date
- MUST use kebab-case for description

**Structure**:
- MUST include: Objectives, Work Completed, Decisions Made, Blockers, Resolutions, Next Steps
- MUST be specific about accomplishments (no vague "did stuff")
- MUST document decisions made during session
- MUST note blockers encountered and how resolved

**Historical Record**:
- MUST be treated as historical (never edit after creation)
- MUST link to related artifacts (code, docs, plans, ADRs)

## Defaults (SHOULD)

**When to Create**:
- SHOULD create for significant work sessions only
- SHOULD create when multiple tasks accomplished
- SHOULD create when important decisions made
- SHOULD NOT create for routine minor changes

**Content Quality**:
- SHOULD provide specific metrics when possible
- SHOULD document context for future reference
- SHOULD link to all related artifacts

**Organization**:
- SHOULD maintain index.md organized chronologically
- SHOULD group by month in index

## Workflow

**When documenting session**:
1. Create file with today's date at end of session
2. List specific accomplishments
3. Document decisions made
4. Note blockers and resolutions
5. Link to related code, docs, plans, ADRs
6. Add to index.md

**Session vs other docs**:
- Session Report: Record what happened (historical, never updated)
- Plan: Guide future work (updated frequently)
- ADR: Record architecture decision (status only updated)

## Quick Reference

**Purpose**: Work session documentation and historical record

**File Pattern**: `YYYY-MM-DD-session-description.md`

**Examples**:
- `2026-01-19-enum-repositories-migration.md`
- `2026-01-19-doc-system-planning.md`
- `2026-01-20-phase-2-kickoff.md`

**When to Create**:
- ✅ Significant work completed
- ✅ Important decisions made
- ✅ Blockers encountered and resolved
- ❌ Routine minor changes
- ❌ Single-file updates

**Lifecycle**: All session reports are "completed" (document past work)

**Related**:
- [Plans](../plans/CLAUDE.md) - Future work guidance
- [Decisions](../decisions/CLAUDE.md) - Architecture decisions
- [Session Report Template](../templates/session-report.md)
