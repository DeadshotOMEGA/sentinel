# Testing Standards

Apply to: All backend code in Sentinel project

## Rule

Integration-first testing strategy using Vitest, Testcontainers, and Supertest.

## When This Applies

- Writing new features or services
- Modifying existing database operations
- Adding or changing API endpoints
- Fixing bugs in business logic

## Testing Philosophy

### Testing Trophy (NOT Pyramid)

```
        /\
       /  \        ← E2E (15%) - Critical user flows
      /----\
     /      \      ← Integration (70%) - PRIMARY FOCUS
    /--------\
   /          \    ← Unit (15%) - Utilities, pure functions
  /------------\
 /   Static     \  ← TypeScript, ESLint (already enforced)
```

**Rationale**: Integration tests provide the best confidence-to-cost ratio. They catch real bugs that unit tests miss (e.g., SQL errors, API contract violations).

## Coverage Targets

| Layer | Target | Tools |
|-------|--------|-------|
| **Repositories** | 90% | Vitest + Testcontainers |
| **Routes** | 80% | Vitest + Supertest |
| **Business Logic** | 85% | Vitest |
| **Overall** | 80%+ | @vitest/coverage-v8 |

**Enforcement**: CI/CD fails if coverage drops below thresholds.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── helpers/
│   ├── testcontainers.ts      # PostgreSQL container helper
│   ├── factories.ts           # Test data factories
│   └── fixtures.ts            # Static fixtures
├── unit/                      # 15% of tests
│   ├── services/
│   ├── utils/
│   └── lib/
├── integration/               # 70% of tests
│   ├── repositories/          # Database tests (Testcontainers)
│   ├── routes/                # API tests (Supertest)
│   └── services/              # Service integration
└── e2e/                       # 15% of tests
    └── attendance-flow.test.ts
```

## 1. Repository Tests (Testcontainers)

**Required for**: Any file in `src/repositories/`

### Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '@/tests/helpers/testcontainers'

describe('PersonnelRepository', () => {
  const testDb = new TestDatabase()

  beforeAll(async () => {
    await testDb.start() // Starts PostgreSQL container
  })

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset() // Clear all tables
  })

  it('should create personnel with RFID card', async () => {
    // Test implementation...
  })
})
```

### Must Test

- ✅ CRUD operations (create, read, update, delete)
- ✅ Unique constraints (e.g., duplicate RFID cards)
- ✅ Foreign key relationships
- ✅ Query filters (e.g., find by division, search by name)
- ✅ Pagination
- ✅ Error handling (e.g., not found, validation errors)

### Naming Convention

`<entity>Repository.test.ts` (e.g., `personnelRepository.test.ts`)

## 2. Route Tests (Supertest)

**Required for**: Any file in `src/routes/`

### Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '@/app'
import { TestDatabase } from '@/tests/helpers/testcontainers'

describe('GET /api/attendance/today', () => {
  const testDb = new TestDatabase()
  let apiKey: string

  beforeAll(async () => {
    await testDb.start()
    apiKey = await createTestApiKey()
  })

  afterAll(async () => {
    await testDb.stop()
  })

  it('should return today\'s attendance', async () => {
    const response = await request(app)
      .get('/api/attendance/today')
      .set('x-api-key', apiKey)
      .expect(200)

    expect(response.body).toHaveProperty('data')
  })
})
```

### Must Test

- ✅ 200 OK - Happy path
- ✅ 400 Bad Request - Invalid input
- ✅ 401 Unauthorized - Missing/invalid API key
- ✅ 403 Forbidden - Insufficient permissions
- ✅ 404 Not Found - Resource doesn't exist
- ✅ 500 Internal Server Error - Server failures

### Naming Convention

`<route>.test.ts` (e.g., `attendance.test.ts`, `personnel.test.ts`)

## 3. Unit Tests (Business Logic)

**Required for**: Pure functions, utilities, complex algorithms

### Pattern

```typescript
import { describe, it, expect } from 'vitest'
import { calculateAttendanceRate } from '@/services/attendanceService'

describe('calculateAttendanceRate', () => {
  it('should calculate rate correctly', () => {
    const rate = calculateAttendanceRate({
      totalDays: 20,
      presentDays: 18,
      excusedDays: 1,
    })

    expect(rate).toBe(0.95) // 19/20
  })

  it('should handle zero total days', () => {
    const rate = calculateAttendanceRate({
      totalDays: 0,
      presentDays: 0,
      excusedDays: 0,
    })

    expect(rate).toBe(0)
  })
})
```

### When to Write Unit Tests

✅ Pure functions (no side effects)
✅ Complex calculations or algorithms
✅ Utility functions (date formatting, validation, parsing)

❌ Database calls (use integration tests)
❌ API calls (use integration tests)
❌ Simple getters/setters

## 4. E2E Tests (Critical Flows)

**Required for**: 2-3 most critical user journeys

### Pattern

```typescript
describe('Attendance Flow (E2E)', () => {
  it('should complete check-in/check-out flow', async () => {
    // 1. Create personnel
    // 2. Check in
    // 3. Verify attendance record
    // 4. Check out
    // 5. Verify both records exist
  })
})
```

### Critical Flows for Sentinel

1. **Attendance Flow**: RFID check-in → database record → Socket.IO broadcast
2. **CSV Import**: Upload CSV → parse → validate → bulk insert
3. **Admin Login**: Login → JWT token → access protected route

## Property-Based Testing

**Required for**: CSV parsing, data validation edge cases

```typescript
import * as fc from 'fast-check'

it('should handle any valid CSV row', () => {
  fc.assert(
    fc.property(
      fc.record({
        firstName: fc.string({ minLength: 1, maxLength: 50 }),
        lastName: fc.string({ minLength: 1, maxLength: 50 }),
      }),
      (row) => {
        const parsed = parseCsvRow(row)
        expect(parsed.firstName).toBe(row.firstName)
      }
    )
  )
})
```

## Test Data Management

### Use Factories (NOT Fixtures)

**Good** (Factory):
```typescript
function createPersonnel(overrides = {}) {
  return {
    id: uuidv4(),
    firstName: 'John',
    lastName: 'Doe',
    rank: 'AB',
    ...overrides,
  }
}

const personnel = createPersonnel({ firstName: 'Jane' })
```

**Bad** (Fixture):
```typescript
const FIXTURE_PERSONNEL = {
  id: 'fixed-uuid',
  firstName: 'John', // Brittle, hard to customize
}
```

**Why**: Factories are flexible, fixtures are brittle and cause flaky tests.

## Test Organization

### Use `describe` blocks

```typescript
describe('PersonnelRepository', () => {
  describe('create', () => {
    it('should create with valid data', ...)
    it('should reject duplicate RFID cards', ...)
  })

  describe('findByRfidCard', () => {
    it('should find personnel by card', ...)
    it('should return null for non-existent card', ...)
  })
})
```

### Naming Convention

- **describe**: Describe the unit being tested (class, function, route)
- **it**: Describe the expected behavior ("should...")

## Running Tests

```bash
# All tests
pnpm test

# Watch mode (for TDD)
pnpm test:watch

# Coverage report
pnpm test:coverage

# Specific file
pnpm test tests/integration/repositories/personnelRepository.test.ts

# UI mode (visual test runner)
pnpm test:ui
```

## CI/CD Enforcement

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: pnpm test:coverage

- name: Check coverage thresholds
  run: |
    if [ $(jq '.total.lines.pct' coverage/coverage-summary.json) -lt 80 ]; then
      echo "Coverage below 80%"
      exit 1
    fi
```

## When to Skip Tests

❌ NEVER skip tests for repositories or routes
✅ Can skip tests for:
  - Auto-generated code (Prisma client)
  - Config files
  - Type definitions

## Test Isolation

### Each test must be independent

**Good**:
```typescript
beforeEach(async () => {
  await testDb.reset() // Clear database before each test
})

it('should create personnel', async () => {
  const personnel = await repository.create(...)
  expect(personnel.id).toBeDefined()
})
```

**Bad**:
```typescript
// ❌ Test depends on previous test's data
it('should create personnel', async () => {
  personnel = await repository.create(...)
})

it('should find personnel', async () => {
  const found = await repository.findById(personnel.id) // Flaky!
})
```

## Performance Guidelines

- Integration tests should run in < 2 minutes total
- Each Testcontainers test should complete in < 5 seconds
- Use `beforeAll` for slow setup (container start), `beforeEach` for fast setup (data reset)

## Common Mistakes

### ❌ Don't Mock the Database

**Bad**:
```typescript
vi.mock('@/lib/db', () => ({
  prisma: {
    personnel: {
      create: vi.fn().mockResolvedValue({ id: '123' }),
    },
  },
}))
```

**Good**:
```typescript
// Use real database with Testcontainers
const testDb = new TestDatabase()
await testDb.start()
```

**Why**: Mocks don't catch SQL errors, constraint violations, or type mismatches.

### ❌ Don't Use `any` in Tests

**Bad**:
```typescript
const response: any = await request(app).get('/api/personnel')
```

**Good**:
```typescript
const response = await request(app).get('/api/personnel')
expect(response.body.data).toHaveLength(5)
expect(response.body.data[0]).toHaveProperty('firstName')
```

## Success Metrics

Before merging a PR, verify:

- [ ] All new code has tests
- [ ] Coverage meets thresholds (90% repos, 80% routes, 85% logic)
- [ ] Tests pass in CI/CD
- [ ] No flaky tests (run tests 3x to verify)
- [ ] Test run time < 2 minutes

## Related

- [docs/07-testing-strategy.md](../../docs/07-testing-strategy.md) - Detailed testing guide
- [.claude/agents/testing-specialist.md](../.claude/agents/testing-specialist.md) - Testing agent
