# Testing Documentation (AI-First Guide)

**Purpose:** Test strategy, patterns, and coverage documentation

**AI Context Priority:** high

**When to Load:** User writing tests, discussing test strategy, checking coverage

**Triggers:** test, testing, coverage, integration, testcontainers, vitest

---

## Quick Reference

### What's Here

Testing strategy and implementation guides:
- Integration-first testing philosophy
- Testcontainers setup and usage
- Repository testing patterns
- Service testing patterns
- Coverage targets and monitoring

### Key Principle

**Integration-first with real database** - All data access code tested against PostgreSQL via Testcontainers, not mocks.

---

## Testing Philosophy

### Why Integration-First?

**Benefits:**
- Catch real database issues (constraints, relations)
- Test actual behavior, not mock behavior
- Refactor-safe (tests verify outcomes, not implementation)
- Confidence in deployments

**When to use unit tests:**
- Pure functions only
- No database, no I/O
- Business logic calculations
- Utilities and helpers

**Coverage targets:**
- Repositories: 90%+
- Services: 85%+
- Routes: 80%+
- Overall: 80%+

---

## Code Locations

**Test infrastructure:**
- [apps/backend/tests/helpers/testcontainers.ts](../../../../apps/backend/tests/helpers/testcontainers.ts) - TestDatabase class
- [apps/backend/tests/helpers/factories.ts](../../../../apps/backend/tests/helpers/factories.ts) - Test data factories
- [apps/backend/vitest.config.ts](../../../../apps/backend/vitest.config.ts) - Coverage config

**Test directories:**
- `apps/backend/tests/integration/repositories/` - 14 repository test files
- `apps/backend/tests/integration/services/` - Service integration tests
- `apps/backend/tests/integration/routes/` - API route tests

---

## Document Examples

### Explanation Docs
- `explanation-integration-first.md` - Why this approach
- `explanation-testcontainers.md` - How Testcontainers works
- `explanation-coverage-strategy.md` - Coverage targets rationale

### Reference Docs
- `reference-coverage-targets.md` - Required coverage by layer
- `reference-test-commands.md` - Test running commands
- `reference-test-patterns.md` - Common test structures

### How-to Docs
- `howto-write-repository-tests.md` - Repository testing guide
- `howto-write-service-tests.md` - Service testing guide
- `howto-write-route-tests.md` - API route testing guide
- `howto-debug-tests.md` - Debugging failing tests

---

## Testing Patterns

### Repository Test Structure

```typescript
describe('MemberRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: MemberRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new MemberRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  it('should create member with valid data', async () => {
    const data = createMemberData()
    const member = await repo.create(data)

    expect(member.id).toBeDefined()
    expect(member.serviceNumber).toBe(data.serviceNumber)
  })
})
```

### Service Test Structure

```typescript
describe('MemberService Integration Tests', () => {
  const testDb = new TestDatabase()
  let service: MemberService

  beforeAll(async () => {
    await testDb.start()
    const memberRepo = new MemberRepository(testDb.prisma!)
    service = new MemberService(memberRepo)  // Real repo, not mock
  }, 60000)

  // Tests verify business logic with real data access
})
```

### Route Test Structure

```typescript
import request from 'supertest'
import { app } from '../../../src/app'

describe('POST /api/members', () => {
  it('should create member with 201 status', async () => {
    const response = await request(app)
      .post('/api/members')
      .send({ firstName: 'John', lastName: 'Doe' })
      .expect(201)

    expect(response.body).toHaveProperty('id')
  })
})
```

---

## Test Coverage Requirements

### By Layer

**Repositories (90%+):**
- All CRUD operations
- Unique constraints
- Foreign keys
- Queries and filters
- Pagination
- Transactions

**Services (85%+):**
- Business logic
- Error handling
- Integration with repos
- Transaction coordination

**Routes (80%+):**
- All HTTP methods
- Status codes (200, 400, 401, 404, 409, 500)
- Request validation
- Response format
- Auth requirements

---

## Running Tests

```bash
# All tests
pnpm test

# Specific file
pnpm test member-repository.test.ts

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

---

## Related Documentation

**Global rule:**
- [Testing Strategy Rule](../../../../.claude/rules/testing-strategy.md)

**Implementation:**
- [Backend Rebuild Plan - Phase 1](../../plans/active/backend-rebuild-plan.md#phase-1-testing-foundation--setup-weeks-1-2---critical)

**Examples:**
- [Member Repository Tests](../../../../apps/backend/tests/integration/repositories/member-repository.test.ts)
- [Badge Repository Tests](../../../../apps/backend/tests/integration/repositories/badge-repository.test.ts)

---

**Last Updated:** 2026-01-19
