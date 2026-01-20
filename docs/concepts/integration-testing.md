---
type: concept
title: "Integration Testing"
status: published
created: 2026-01-19
last_updated: 2026-01-19
ai:
  priority: high
  context_load: on-demand
  triggers:
    - integration test
    - integration testing
    - real database
    - testcontainers
  token_budget: 300
---

# Integration Testing

**Definition:** Tests that verify system components work together correctly with real external dependencies (databases, APIs, services).

**Core Principle:** Test with real PostgreSQL database instead of mocks.

---

## Key Characteristics

- **Real dependencies**: Uses actual PostgreSQL via Testcontainers
- **Database reset**: Fresh state between tests for isolation
- **Behavior verification**: Tests what the system does, not how
- **Constraint validation**: Catches database-level issues (FK violations, unique constraints)
- **Migration verification**: Ensures Prisma schema matches expectations

---

## Why Integration-First?

1. **Catch real issues**: Tests run against actual PostgreSQL, not mocks
2. **Deployment confidence**: If tests pass, code works with real database
3. **Faster development**: No time maintaining mock complexity
4. **Better coverage**: One integration test covers multiple units
5. **Refactor-safe**: Tests verify behavior, not implementation details

---

## When to Use

**Use integration tests for:**
- ✅ Repositories (data access layer)
- ✅ Services (business logic with data dependencies)
- ✅ API routes (full request/response cycle)

**Don't use for:**
- ❌ Pure functions (use unit tests)
- ❌ Utilities without dependencies (use unit tests)
- ❌ Complex business logic that can be isolated (use unit tests)

---

## Example Pattern

```typescript
describe('MemberRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: MemberRepository

  beforeAll(async () => {
    await testDb.start()  // Start PostgreSQL container
    repo = new MemberRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()  // Cleanup
  })

  beforeEach(async () => {
    await testDb.reset()  // Fresh database for each test
  })

  it('should create member with valid data', async () => {
    const member = await repo.create({
      serviceNumber: 'SN123',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: 'div-1',
    })

    expect(member.id).toBeDefined()
    expect(member.serviceNumber).toBe('SN123')
  })

  it('should throw on duplicate service number', async () => {
    await repo.create({ serviceNumber: 'SN123', ... })

    await expect(
      repo.create({ serviceNumber: 'SN123', ... })
    ).rejects.toThrow('Unique constraint')
  })
})
```

---

## Coverage Target

**70-90% for repositories/services** (Sentinel standard)

---

## Related Concepts

- [Testcontainers](testcontainers.md) - Docker containers for testing
- [Repository Pattern](repository-pattern.md) - Data access abstraction
- [Test Factories](test-factories.md) - Test data creation
- [Coverage Targets](coverage-targets.md) - Quality thresholds

---

## Anti-Patterns

### ❌ Mocking the Database

**Wrong:**
```typescript
const mockPrisma = { member: { create: vi.fn() } }
```

**Why it's wrong:** Tests pass with mocks but fail with real database (constraints, migrations, relations).

**Right:** Use Testcontainers with real PostgreSQL.

---

### ❌ Shared Test Data

**Wrong:**
```typescript
// Global setup
const testMember = await repo.create({ ... })

// Test 1 uses testMember
// Test 2 modifies testMember  // ⚠️ Flaky!
```

**Why it's wrong:** Tests affect each other, causing flakiness.

**Right:** Create fresh data in each test or use `beforeEach` reset.
