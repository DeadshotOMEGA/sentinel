# Testing Strategy

Integration-first testing with real databases. Prioritize integration tests over unit tests for data access and business logic.

## Philosophy

**Why Integration-First?**

1. Catch real issues (tests run against actual PostgreSQL, not mocks)
2. Confidence in deployments (if tests pass, code works with real database)
3. Faster development (no time wasted maintaining mocks)
4. Better coverage (one integration test covers multiple units)
5. Refactor-safe (tests verify behavior, not implementation)

## Test Distribution

| Type            | Percentage | Use For                               |
| --------------- | ---------- | ------------------------------------- |
| **Integration** | 70-90%     | Repositories, services, routes        |
| **Unit**        | 10-20%     | Pure functions, utilities, validators |
| **E2E**         | 5-10%      | Critical user flows                   |

## Coverage Targets

| Layer        | Target | Priority  |
| ------------ | ------ | --------- |
| Repositories | 90%+   | 🔴 High   |
| Services     | 85%+   | 🔴 High   |
| Routes       | 80%+   | 🟡 Medium |
| Overall      | 80%+   | 🟡 Medium |
| Utils        | 70%+   | 🟢 Low    |

## Test Types

### Integration Tests (Primary)

**Use for**: Repositories, services, routes

**Tools**: Vitest + Testcontainers (PostgreSQL) + Supertest (routes)

**Characteristics**:

- Real database (testcontainers)
- Database reset between tests
- Test actual behavior
- Verify DB constraints & relations
- Catch Prisma migration issues

### Unit Tests (Secondary)

**Use for**: Pure functions, utilities, validators

**Characteristics**:

- No external dependencies
- Fast execution (< 1ms per test)
- Test logic only, not I/O
- Mock-free when possible

**Examples**: Date formatting, validation logic, calculations, type guards

### E2E Tests (Tertiary)

**Use for**: Critical user flows only

**Tools**: Playwright

**Characteristics**:

- Full application stack
- Browser automation
- Test complete user journeys
- Slow but high confidence

**Examples**: Login flow, check-in flow, CSV import flow

## Repository Testing Requirements

Every repository must test:

- ✅ CRUD operations (create, read, update, delete)
- ✅ Unique constraints & FK violations
- ✅ Query filters & pagination
- ✅ Error handling (not found, duplicates)
- ✅ Transactions (commit on success, rollback on error)
- ✅ Relations (includes, nested)

## Test Organization

```
tests/
├── setup.ts                    # Global setup
├── helpers/
│   ├── testcontainers.ts      # TestDatabase class
│   ├── factories.ts           # Test data factories
│   └── supertest-setup.ts     # Express app for testing
├── integration/               # 70% of tests
│   ├── repositories/
│   ├── services/
│   └── routes/
└── e2e/                       # 10% of tests
```

**Naming**: `*.test.ts` (NOT `.spec.ts`)

## Best Practices

### DO

✅ Reset database between tests (`beforeEach`)
✅ Use real database for repositories/services
✅ Test error cases (not found, duplicates, FK violations)
✅ Use factories for test data
✅ Test all status codes for routes
✅ Use descriptive test names (behavior, not implementation)
✅ Run tests before committing
✅ Aim for target coverage

### DON'T

❌ Mock database in repository tests
❌ Share test data between tests (causes flakiness)
❌ Use production database for tests
❌ Skip error case tests
❌ Test implementation details (mock.called, etc.)
❌ Commit code without tests
❌ Ignore coverage reports

## Common Patterns

**Repository test setup**:

```typescript
describe('MyRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: MyRepository

  beforeAll(async () => await testDb.start(), 60000)
  afterAll(async () => await testDb.stop())
  beforeEach(async () => await testDb.reset())

  // Tests here
})
```

**Route test with Supertest**:

```typescript
describe('POST /api/members', () => {
  it('should create member with 201 status', async () => {
    await request(app).post('/api/members').send({ firstName: 'John', lastName: 'Doe' }).expect(201)
  })
})
```

**Test data factories** (NOT fixtures):

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

## Running Tests

```bash
pnpm test                # All tests
pnpm test:coverage       # With coverage report
pnpm test:watch          # Watch mode (TDD)
```

## Troubleshooting

**Slow tests** (> 5s per file):

- ✅ Reuse testcontainers (`.withReuse()`)
- ✅ Run queries in parallel where possible
- ✅ Only create data you need

**Flaky tests**:

- ✅ Reset database between tests (`beforeEach`)
- ✅ Don't depend on execution order
- ✅ Await all async operations

**Low coverage**:

- ✅ Run `pnpm test:coverage` to see uncovered lines
- ✅ Test all branches (success + error paths)
- ✅ Add tests for error cases

## Migration Checklist

When migrating a repository:

- [ ] Extract repository file
- [ ] Update imports to new structure
- [ ] Add dependency injection constructor
- [ ] Create integration test file
- [ ] Test CRUD, filters, errors, transactions
- [ ] Run coverage report
- [ ] Verify 90%+ coverage
- [ ] Commit with tests

## References

For comprehensive testing patterns, troubleshooting, and examples, see project-specific testing documentation.
