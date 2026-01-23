# CLAUDE Rules: Backend Testing

## Scope

Applies when creating or modifying tests in: `apps/backend/tests/`

## Non-Negotiables (MUST / MUST NOT)

**Testing Strategy**:

- MUST follow Trophy Model: 70% integration, 15% unit, 15% E2E
- MUST use Testcontainers with real PostgreSQL (NOT mocks)
- MUST achieve minimum coverage: Repositories 90%+, Routes 80%+, Services 85%+
- MUST NOT mock database operations
- MUST set `fileParallelism: false` in vitest.config.ts (prevents Testcontainers race conditions)

**Dependency Injection** (CRITICAL):

- MUST inject PrismaClient via repository constructor
- MUST use `this.prisma` in ALL repository methods (NEVER global `prisma`)
- MUST NOT use `await prisma.` or ` prisma.` (causes auth errors in tests)
- See dependency injection pattern in testing-patterns.md

**Repository Test Coverage**:

- MUST test CRUD operations (create, read, update, delete)
- MUST test unique constraints & FK violations
- MUST test query filters & pagination
- MUST test error handling (not found, duplicates)
- MUST test transactions (commit on success, rollback on error)
- MUST test relations (includes, nested)

**Route Test Coverage**:

- MUST test all status codes: 200, 201, 400, 401, 403, 404, 500
- MUST use Supertest with full Express app
- MUST NOT mock middleware or routes

## Defaults (SHOULD)

**Test Structure**:

- SHOULD use `setupRepositoryTest` helper to reduce boilerplate
- SHOULD use factory functions for test data (NOT fixtures)
- SHOULD reset database between tests via `beforeEach`

**Performance**:

- SHOULD complete integration tests in < 2 minutes total
- SHOULD use Testcontainers `.withReuse()` for faster startup

## Workflow

**When writing repository tests**:

1. Use `setupRepositoryTest` helper or standard pattern with `beforeAll`/`afterAll`
2. Inject test Prisma client: `new Repository(testDb.prisma!)`
3. Reset database in `beforeEach`: `await testDb.reset()`
4. Test happy path + error cases for each method
5. Verify coverage: `pnpm test --coverage`

**When writing route tests**:

1. Use Supertest with `import { app } from '@/app.js'`
2. Test all status codes (success + error cases)
3. Verify authentication and authorization
4. Check response body structure

**When tests fail with authentication errors**:

1. Verify `this.prisma` is used in all repository methods
2. Run `pnpm check:prisma` to find global `prisma` usage
3. See troubleshooting in testing-patterns.md for detailed fixes

**When running tests in parallel**:

1. Ensure `fileParallelism: false` is set in vitest.config.ts
2. If constraint errors occur, clean test containers: `pnpm test:clean:force`
3. See Docker container cleanup section in testing-patterns.md

## Reference

See `/docs/guides/reference/testing-patterns.md` for:

- Standard and simplified repository test patterns
- Route test patterns
- Dependency injection examples
- Troubleshooting commands
- Docker container cleanup procedures
