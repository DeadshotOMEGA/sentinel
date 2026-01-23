# CLAUDE Rules: Events Domain

## Scope

Applies when creating documentation in: `docs/domains/events/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST document visitor management, events, and temporary access features
- MUST be events domain-specific (NOT personnel or check-in)
- MUST follow Diátaxis classification (tutorial, howto, reference, explanation)
- MUST use type prefix in filenames

**File Naming**:

- MUST use format: `[type]-[topic].md`
- MUST use kebab-case
- MUST NOT use generic names without type prefix

**Examples**:

- `explanation-visitor-workflow.md`
- `reference-event-api.md`
- `howto-register-visitor.md`

**Documentation Placement**:

- MUST use `docs/domains/events/` for visitor and event features
- MUST NOT mix with personnel domain (separate concern)
- MUST NOT mix with check-in domain (different business logic)

## Defaults (SHOULD)

**When to Create**:

- SHOULD create for visitor sign-in/out workflows
- SHOULD create for event management features
- SHOULD create for temporary access documentation
- SHOULD NOT create for member attendance (use check-in domain)

**Organization**:

- SHOULD include complete frontmatter with type, status, dates
- SHOULD link to personnel domain for member attendees
- SHOULD reference event and visitor repository code

## Workflow

**When documenting events feature**:

1. Determine document type (tutorial, howto, reference, explanation)
2. Create file with type prefix: `[type]-[topic].md`
3. Use template from `@docs/templates/`
4. Link to visitor/event repository and service code
5. Cross-reference personnel and check-in domains

## Quick Reference

**Core Entities**: Visitors, Events, EventAttendees

**Code Locations**:

- Repositories: `apps/backend/src/repositories/visitor-repository.ts`, `event-repository.ts`
- Services: `apps/backend/src/services/event-service.ts`
- Routes: `apps/backend/src/routes/visitors.ts`, `events.ts`
- Schema: `packages/database/prisma/schema.prisma`
