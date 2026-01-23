# CLAUDE Rules: Backend Testing

## Scope

Applies when creating or modifying tests in: `apps/backend/tests/`

## Non-Negotiables (MUST / MUST NOT)

- MUST follow Trophy Model: 70% integration, 15% unit, 15% E2E
- MUST use Testcontainers with real PostgreSQL (NOT mocks)
- MUST achieve minimum coverage: Repositories 90%+, Routes 80%+, Services 85%+
- MUST set `fileParallelism: false` in vitest.config.ts (prevents Testcontainers race conditions)
- MUST inject PrismaClient via repository constructor
- MUST use `this.prisma` in ALL repository methods (NEVER global `prisma`)
- MUST NOT use `await prisma.` or bare `prisma.` (causes auth errors in tests)
- MUST test CRUD operations, constraints, filters, pagination, error handling, transactions, and relations
- MUST test all route status codes: 200, 201, 400, 401, 403, 404, 500
- MUST use Supertest with full Express app (NOT mock middleware)

## Defaults (SHOULD)

- SHOULD use `setupRepositoryTest` helper for cleaner tests
- SHOULD use factory functions for test data (NOT fixtures)
- SHOULD reset database between tests via `beforeEach`
- SHOULD complete integration tests in < 2 minutes total
- SHOULD use Testcontainers `.withReuse()` for faster startup

## Workflow

**When writing repository tests**: Use `setupRepositoryTest` → Inject test Prisma client → Reset in `beforeEach` → Test happy path + error cases → Verify 90%+ coverage

**When writing route tests**: Use Supertest with full app → Test all status codes → Verify auth and response structure

**When tests fail with authentication errors**: Verify `this.prisma` in all methods → Run `pnpm check:prisma` → Check inside `Promise.all` and transactions

**When running tests in parallel**: Set `fileParallelism: false` → If constraint errors, run `pnpm test:clean:force`
