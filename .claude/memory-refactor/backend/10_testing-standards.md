---
paths:
  - '**/*.test.ts'
  - '**/tests/**/*'
  - '**/vitest.config.ts'
---

# Testing Standards

Integration-first testing using Vitest, Testcontainers, and Supertest.

## Testing Strategy

**Trophy Model** (NOT Pyramid):

- **70% Integration** - Testcontainers (DB), Supertest (routes)
- **15% Unit** - Pure functions, utilities
- **15% E2E** - Critical user flows (Playwright)

**Rationale**: Integration tests catch real bugs (SQL errors, FK violations, API contracts) that unit tests miss.

## Coverage Targets

| Layer        | Target | Enforcement          |
| ------------ | ------ | -------------------- |
| Repositories | 90%+   | CI/CD fails if below |
| Routes       | 80%+   | CI/CD fails if below |
| Services     | 85%+   | CI/CD fails if below |
| Overall      | 80%+   | CI/CD fails if below |

## Repository Tests (Testcontainers)

**Required for**: All files in `src/repositories/`

**Must test**:

- ✅ CRUD operations (create, read, update, delete)
- ✅ Unique constraints & FK violations
- ✅ Query filters & pagination
- ✅ Error handling (not found, duplicates)
- ✅ Transactions (commit on success, rollback on error)
- ✅ Relations (includes, nested)

**Pattern**:

```typescript
describe('PersonnelRepository', () => {
  const testDb = new TestDatabase()
  let repo: PersonnelRepository

  beforeAll(async () => await testDb.start(), 60000)
  afterAll(async () => await testDb.stop())
  beforeEach(async () => await testDb.reset())

  it('should create record with valid data', ...)
  it('should throw on duplicate unique field', ...)
})
```

## Route Tests (Supertest)

**Required for**: All files in `src/routes/`

**Must test all status codes**:

- ✅ 200 OK, 201 Created
- ✅ 400 Bad Request (invalid input)
- ✅ 401 Unauthorized (missing/invalid auth)
- ✅ 403 Forbidden (insufficient permissions)
- ✅ 404 Not Found
- ✅ 500 Internal Server Error

**Pattern**:

```typescript
describe('POST /api/members', () => {
  it('should create member with 201 status', async () => {
    await request(app).post('/api/members').send({ firstName: 'John', lastName: 'Doe' }).expect(201)
  })
})
```

## Unit Tests

**Use for**: Pure functions, utilities, complex algorithms

**When to write**:

- ✅ Pure functions (no side effects)
- ✅ Complex calculations
- ✅ Utility functions (date formatting, validation)

**When NOT to write**:

- ❌ Database calls (use integration tests)
- ❌ API calls (use integration tests)
- ❌ Simple getters/setters

## Test Data Management

**Use factories** (NOT fixtures):

```typescript
function createMemberData(overrides = {}) {
  return {
    serviceNumber: `SN${Date.now()}`,
    rank: 'AB',
    firstName: 'Test',
    lastName: 'Member',
    ...overrides,
  }
}
```

**Reset between tests**:

```typescript
beforeEach(async () => {
  await testDb.reset() // Truncate all tables
  await testDb.seed() // Re-create baseline data
})
```

## Running Tests

```bash
pnpm test                # All tests
pnpm test:coverage       # With coverage report
pnpm test:watch          # Watch mode (TDD)
pnpm test:ui             # Visual test runner
```

## Common Mistakes

### ❌ Don't Mock the Database

**Bad**: `vi.mock('@/lib/db', () => ({...}))`
**Good**: Use real database with Testcontainers

**Why**: Mocks don't catch SQL errors, constraint violations, or type mismatches.

### ❌ Don't Use `any` in Tests

**Bad**: `const response: any = await request(app).get('/api/personnel')`
**Good**: Let TypeScript infer types, use proper assertions

### ❌ Don't Share Test Data Between Tests

**Bad**: Creating data once in `beforeAll` and reusing
**Good**: Create fresh data in each test (`beforeEach` reset)

## Performance Guidelines

- Integration tests: < 2 minutes total
- Each Testcontainers test: < 5 seconds
- Use `beforeAll` for slow setup (container start)
- Use `beforeEach` for fast setup (data reset)

## Success Metrics

Before merging PR:

- [ ] All new code has tests
- [ ] Coverage meets thresholds
- [ ] Tests pass in CI/CD
- [ ] No flaky tests (run 3x to verify)
- [ ] Test run time < 2 minutes

## Full Guide

**See**: `@docs/guides/testing-guide.md` for comprehensive patterns, troubleshooting, and examples.
