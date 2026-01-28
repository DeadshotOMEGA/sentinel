# CLAUDE Rules: Personnel Domain

## Scope

Applies when creating documentation in: `docs/domains/personnel/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST document member, division, rank, badge, and qualification management features
- MUST be personnel domain-specific (NOT cross-cutting or other domains)
- MUST follow Diátaxis classification (tutorial, howto, reference, explanation)
- MUST use type prefix in filenames

**File Naming**:

- MUST use format: `[type]-[topic].md`
- MUST use kebab-case
- MUST NOT use generic names without type prefix

**Examples**:

- `explanation-member-lifecycle.md`
- `reference-member-api.md`
- `howto-assign-badge.md`

**Documentation Placement**:

- MUST use `docs/domains/personnel/` for member/badge/division features
- MUST NOT mix with check-in domain (separate concern)
- MUST NOT mix with authentication (separate domain)

## Defaults (SHOULD)

**When to Create**:

- SHOULD create for member management features
- SHOULD create for division structure documentation
- SHOULD create for badge assignment workflows
- SHOULD NOT create for cross-cutting testing or deployment

**Organization**:

- SHOULD include complete frontmatter with type, status, dates
- SHOULD link to related check-in and events domains
- SHOULD reference actual code locations

## Workflow

**When documenting personnel feature**:

1. Determine document type (tutorial, howto, reference, explanation)
2. Create file with type prefix: `[type]-[topic].md`
3. Use template from `@docs/templates/`
4. Link to related code in `apps/backend/src/repositories/`, `apps/backend/src/routes/`
5. Cross-reference related domains (checkin, events)

## Quick Reference

**Core Entities**: Members, Divisions, Badges, Qualifications

**Code Locations**:

- Repositories: `apps/backend/src/repositories/member-repository.ts`, `apps/backend/src/repositories/qualification-repository.ts`
- Routes: `apps/backend/src/routes/members.ts`, `apps/backend/src/routes/qualifications.ts`
- Services: `apps/backend/src/services/member-service.ts`, `apps/backend/src/services/qualification-service.ts`
- Schema: `packages/database/prisma/schema.prisma`
