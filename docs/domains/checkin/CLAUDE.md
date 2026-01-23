# CLAUDE Rules: Check-in Domain

## Scope

Applies when creating documentation in: `docs/domains/checkin/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST document badge scanning, check-in/out, and presence tracking features
- MUST be check-in domain-specific (NOT personnel or events)
- MUST follow Diátaxis classification (tutorial, howto, reference, explanation)
- MUST use type prefix in filenames

**File Naming**:

- MUST use format: `[type]-[topic].md`
- MUST use kebab-case
- MUST NOT use generic names without type prefix

**Examples**:

- `explanation-direction-detection.md`
- `reference-checkin-api.md`
- `howto-process-badge-scan.md`

**Documentation Placement**:

- MUST use `docs/domains/checkin/` for badge scanning and presence features
- MUST NOT mix with personnel domain (separate concern)
- MUST NOT mix with real-time patterns (use cross-cutting/monitoring)

## Defaults (SHOULD)

**When to Create**:

- SHOULD create for check-in flow documentation
- SHOULD create for direction detection logic
- SHOULD create for WebSocket real-time updates
- SHOULD NOT create for badge management (use personnel domain)

**Organization**:

- SHOULD include complete frontmatter with type, status, dates
- SHOULD link to personnel domain for member/badge relationships
- SHOULD reference WebSocket implementation code

## Workflow

**When documenting check-in feature**:

1. Determine document type (tutorial, howto, reference, explanation)
2. Create file with type prefix: `[type]-[topic].md`
3. Use template from `@docs/templates/`
4. Link to checkin service and WebSocket code
5. Cross-reference personnel and events domains

## Quick Reference

**Core Flow**: Badge Scan → Validate → Determine Direction → Create Check-in → Broadcast

**Code Locations**:

- Repositories: `apps/backend/src/repositories/checkin-repository.ts`
- Services: `apps/backend/src/services/checkin-service.ts`
- Routes: `apps/backend/src/routes/checkins.ts`
- WebSocket: `apps/backend/src/websocket/checkin-handler.ts`
