# CLAUDE Rules: Repository Layer

## Scope

Applies when editing files under: `apps/backend/src/repositories/`

## Non-Negotiables (MUST / MUST NOT)

- MUST accept optional `PrismaClient` parameter in constructor for dependency injection
- MUST use `this.prisma` in ALL methods (NEVER global `prisma` or in `Promise.all`/transactions/arrow functions)
- MUST achieve 90%+ test coverage with integration tests (Testcontainers, real database)
- MUST test all CRUD operations and error paths (not found, duplicates, FK violations)
- MUST use `update` (singular) in transactions for rollback on missing records (NOT `updateMany`)
- MUST use Prisma types (`Prisma.EntityCreateInput`, `Prisma.EntityUpdateInput`)
- MUST NOT use `any` types

## Defaults (SHOULD)

- SHOULD order methods: constructor, find\*, create, update, delete, count
- SHOULD add JSDoc comments for public methods
- SHOULD test filters, pagination, relationships, and transactions
- SHOULD use `setupRepositoryTest` helper for tests
- SHOULD use `Promise.all` for parallel queries
- SHOULD use `select` to limit returned fields
- SHOULD add indexes for frequently filtered fields

## Workflow

**When creating new repository**: Use template from repository-patterns.md → Add query methods → Create integration test → Verify 90%+ coverage → Check no global `prisma.` usage

**When migrating from develop branch**: Extract file → Update imports → Add DI constructor → Replace `prisma.` with `this.prisma.` → Fix TypeScript errors → Write tests

**When tests fail with authentication error**: Search for `prisma.` → Replace with `this.prisma.` → Check inside `Promise.all` and transactions
