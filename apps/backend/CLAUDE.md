# CLAUDE Rules: Sentinel Backend

## Scope

Applies when editing files under: `apps/backend/`

## Non-Negotiables (MUST / MUST NOT)

- MUST use Express + ts-rest for routes
- MUST use better-auth for authentication
- MUST use Winston logger with correlation IDs
- MUST achieve 80%+ test coverage (repositories: 90%, routes: 80%, services: 85%)
- MUST use integration-first testing strategy (70% integration, 15% unit, 15% E2E)
- MUST use Testcontainers for database tests (NOT mocks)
- MUST use TypeScript strict mode, never use `any` types
- MUST use Valibot schemas from `@sentinel/contracts` for validation
- MUST use Helmet for security headers
- MUST apply rate limiting to all `/api` routes
- MUST use CORS with explicit origin whitelist
- MUST follow repository pattern with dependency injection
- MUST write tests before marking features complete

## Defaults (SHOULD)

- SHOULD use module-specific loggers (`apiLogger`, `dbLogger`, etc.)
- SHOULD include correlation IDs in all logs
- SHOULD log structured metadata (objects, not strings)
- SHOULD test all error paths (4xx and 5xx status codes)
- SHOULD use factory functions for test data (NOT fixtures)
- SHOULD reset database between tests

## Workflow

**When adding new route**: Define Valibot schema → Create ts-rest contract → Implement route → Add integration tests

**When adding new repository**: Create class with DI → Use `this.prisma` in all methods → Write integration tests → Verify 90%+ coverage

**When modifying authentication**: Update auth middleware → Test all flows (session, API key, failure cases)

**When debugging**: Check correlation IDs in logs → Review middleware order in `app.ts` → Verify error handler is last
