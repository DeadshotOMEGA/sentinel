# CLAUDE Rules: Duty Roles Domain

## Scope

Applies when creating documentation in: `docs/domains/duty-roles/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST document duty scheduling, DDS, and Duty Watch features
- MUST be duty roles domain-specific (NOT cross-cutting or other domains)
- MUST follow Diataxis classification (tutorial, howto, reference, explanation)
- MUST use type prefix in filenames

**File Naming**:

- MUST use format: `[type]-[topic].md`
- MUST use kebab-case
- MUST NOT use generic names without type prefix

**Examples**:

- `explanation-duty-watch-flow.md`
- `reference-schedule-api.md`
- `howto-assign-dds.md`

**Documentation Placement**:

- MUST use `docs/domains/duty-roles/` for scheduling features
- MUST NOT mix with personnel domain (separate concern)
- MUST NOT mix with lockup domain (related but separate)

## Defaults (SHOULD)

**When to Create**:

- SHOULD create for DDS scheduling features
- SHOULD create for Duty Watch team management
- SHOULD create for weekly schedule workflows
- SHOULD NOT create for cross-cutting testing or deployment

**Organization**:

- SHOULD include complete frontmatter with type, status, dates
- SHOULD link to related lockup and personnel domains
- SHOULD reference actual code locations

## Workflow

**When documenting duty roles feature**:

1. Determine document type (tutorial, howto, reference, explanation)
2. Create file with type prefix: `[type]-[topic].md`
3. Use template from `@docs/templates/`
4. Link to related code in `apps/backend/src/services/schedule-service.ts`
5. Cross-reference related domains (lockup, personnel)

## Quick Reference

**Core Entities**: DutyRole, DutyPosition, WeeklySchedule, ScheduleAssignment

**Code Locations**:

- Service: `apps/backend/src/services/schedule-service.ts`
- Repository: `apps/backend/src/repositories/schedule-repository.ts`
- Routes: `apps/backend/src/routes/schedules.ts`
- Contract: `packages/contracts/src/contracts/schedule.contract.ts`
- Frontend: `apps/frontend-admin/src/app/schedules/`
