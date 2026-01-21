# CLAUDE Rules: Monitoring Documentation

## Scope
Applies when creating documentation in: `docs/cross-cutting/monitoring/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:
- MUST document logging, metrics, alerts, and observability
- MUST be system-wide monitoring concerns (NOT domain-specific)
- MUST follow Diátaxis classification (tutorial, howto, reference, explanation)
- MUST use kebab-case filenames

**Logging Standards**:
- MUST emphasize structured logging with correlation IDs
- MUST document Winston configuration and log formats
- MUST NOT log passwords, secrets, or sensitive data

## Defaults (SHOULD)

**Content Coverage**:
- SHOULD document structured logging strategy (Winston)
- SHOULD document correlation ID tracking
- SHOULD document health check endpoints
- SHOULD document performance metrics
- SHOULD document alert configuration

**Organization**:
- SHOULD separate concepts (explanation), specs (reference), and procedures (howto)
- SHOULD link to logger implementation code

## Workflow

**When documenting monitoring topic**:
1. Verify it affects multiple domains (NOT domain-specific)
2. Choose appropriate Diátaxis type (tutorial, howto, reference, explanation)
3. Use template from `@docs/templates/`
4. Add frontmatter with AI triggers (logging, metrics, monitoring, winston, correlation)
5. Link from this file's Quick Reference

**When unsure if cross-cutting**:
- Single domain logging → Document in domain CLAUDE.md
- System-wide observability → Use `docs/cross-cutting/monitoring/`

## Quick Reference

**Current Status**: Phase 4 of Backend Rebuild (partially implemented)

**Key Components**:
- Structured Logging (Winston with correlation IDs)
- Health Endpoints (/health, /ready, /live, /metrics)
- Performance Metrics (request times, error rates)
- Error Tracking (log aggregation)

**Code Locations**:
- [Logger setup](../../../../apps/backend/src/lib/logger.ts)
- [Request logger middleware](../../../../apps/backend/src/middleware/request-logger.ts)
- [Health endpoints](../../../../apps/backend/src/routes/health.ts)

**Related**:
- [Deployment](../deployment/CLAUDE.md) - CI/CD integration
- [Testing](../testing/CLAUDE.md) - Test monitoring
- [Backend Rebuild Plan Phase 4.1](../../plans/active/backend-rebuild-plan.md#41-monitoring--observability)
