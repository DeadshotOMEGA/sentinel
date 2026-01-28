# CLAUDE Rules: Lockup Domain

## Scope

Applies when creating documentation in: `docs/domains/lockup/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST document lockup system, building security, and transfer features
- MUST be lockup domain-specific (NOT cross-cutting or other domains)
- MUST follow Diataxis classification (tutorial, howto, reference, explanation)
- MUST use type prefix in filenames

**File Naming**:

- MUST use format: `[type]-[topic].md`
- MUST use kebab-case
- MUST NOT use generic names without type prefix

**Examples**:

- `explanation-lockup-flow.md`
- `reference-lockup-api.md`
- `howto-transfer-lockup.md`

**Documentation Placement**:

- MUST use `docs/domains/lockup/` for lockup/building security features
- MUST NOT mix with duty-roles domain (related but separate)
- MUST NOT mix with personnel domain (separate concern)

## Defaults (SHOULD)

**When to Create**:

- SHOULD create for lockup transfer features
- SHOULD create for building security workflows
- SHOULD create for qualification eligibility documentation
- SHOULD NOT create for cross-cutting testing or deployment

**Organization**:

- SHOULD include complete frontmatter with type, status, dates
- SHOULD link to related duty-roles and personnel domains
- SHOULD reference actual code locations

## Workflow

**When documenting lockup feature**:

1. Determine document type (tutorial, howto, reference, explanation)
2. Create file with type prefix: `[type]-[topic].md`
3. Use template from `@docs/templates/`
4. Link to related code in `apps/backend/src/services/lockup-service.ts`
5. Cross-reference related domains (duty-roles, personnel)

## Quick Reference

**Core Entities**: LockupStatus, LockupTransfer, LockupExecution, MissedCheckout

**Business Rules**:

- Lockup is a transferable responsibility token
- Only members with lockup-eligible qualifications can receive lockup
- DDS cannot check out while holding lockup
- 3am operational day rollover

**Code Locations**:

- Service: `apps/backend/src/services/lockup-service.ts`
- Repository: `apps/backend/src/repositories/lockup-repository.ts`
- Routes: `apps/backend/src/routes/lockup.ts`
- Contract: `packages/contracts/src/contracts/lockup.contract.ts`
- Frontend: `apps/frontend-admin/src/components/lockup/`
- Jobs: `apps/backend/src/jobs/` (daily-reset, lockup-alerts)
