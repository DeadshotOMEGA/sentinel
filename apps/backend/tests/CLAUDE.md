# Backend Testing Infrastructure

## Overview
Integration tests use Testcontainers for real PostgreSQL databases. Each test file manages its own database instance with automatic schema application and reset capabilities.

## Key Components

### TestDatabase Class (`tests/helpers/testcontainers.ts`)
Manages PostgreSQL container lifecycle:
- Starts PostgreSQL 15 in Docker container (port auto-assigned)
- Applies schema via `prisma db push --url`
- Provides isolated Prisma client with adapter for tests
- Handles cleanup and reset between tests

**Container Reuse**: Uses `.withReuse()` flag for speed (~5s vs ~30s startup). Can occasionally cause "container removal already in progress" errors - these usually resolve on retry.

**Schema Application**: Uses `db push` instead of migrations for flexibility during development. Schema is applied fresh to each test container.

### Factory Functions (`tests/helpers/factories.ts`)
Test data creation helpers with sensible defaults:
- `createMember(prisma, overrides?)` - Create test members
- `createBadge(prisma, overrides?)` - Create test badges
- `createDivision(prisma, overrides?)` - Create divisions
- `createTag(prisma, overrides?)` - Create tags
- `createCheckin(prisma, overrides?)` - Create check-ins

All factories accept optional partial objects and return the created entity.

## Standard Repository Test Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { XxxRepository } from '../../../src/repositories/xxx-repository'
import { createXxx, createDivision } from '../../helpers/factories'
import type { CreateXxxInput } from '@sentinel/types'

describe('XxxRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: XxxRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new XxxRepository(testDb.prisma!)  // Inject test DB client
  }, 60000)  // 60s timeout for container startup

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()  // Clear all data
    await testDb.seed()   // Add base divisions (OPS, LOG, ADMIN)
  })

  describe('create', () => {
    it('should create entity with valid data', async () => {
      const input: CreateXxxInput = { /* ... */ }
      const entity = await repo.create(input)

      expect(entity.id).toBeDefined()
      expect(entity).toMatchObject(input)
    })

    it('should throw error on duplicate key', async () => {
      await createXxx(testDb.prisma!, { uniqueField: 'VALUE' })

      const input: CreateXxxInput = { uniqueField: 'VALUE', /* ... */ }
      await expect(repo.create(input)).rejects.toThrow()
    })
  })

  // More test groups...
})
```

## Simplified Test Pattern with Helper

**NEW**: Use `setupRepositoryTest` helper to reduce boilerplate (recommended for all new tests):

```typescript
import { describe, it, expect } from 'vitest'
import { setupRepositoryTest, createTestData } from '../../helpers/repository-test-setup'
import { MemberRepository } from '../../../src/repositories/member-repository'

describe('MemberRepository Integration Tests', () => {
  const { getRepo, getPrisma } = setupRepositoryTest({
    createRepository: (prisma) => new MemberRepository(prisma),
  })

  describe('create', () => {
    it('should create member with valid data', async () => {
      const repo = getRepo()
      const prisma = getPrisma()

      const division = await createTestData.division(prisma)
      const member = await repo.create({
        serviceNumber: 'SN12345',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: division.id,
      })

      expect(member.id).toBeDefined()
      expect(member.serviceNumber).toBe('SN12345')
    })
  })
})
```

**Benefits**:
- ✅ No need to write beforeAll/afterAll/beforeEach hooks
- ✅ Automatic database lifecycle management
- ✅ Built-in error handling if hooks aren't run
- ✅ Cleaner, more focused test code
- ✅ Easy to customize seeding per test suite

**Advanced Usage**:

```typescript
// Custom seed function
const { getRepo, getPrisma } = setupRepositoryTest({
  createRepository: (prisma) => new BadgeRepository(prisma),
  customSeed: async (prisma) => {
    // Create custom baseline data
    await createTestData.division(prisma, { code: 'OPS' })
    await createTestData.member(prisma, { rank: 'CPO1' })
  },
})

// Skip seeding entirely
const { getRepo } = setupRepositoryTest({
  createRepository: (prisma) => new MyRepository(prisma),
  skipSeed: true,
})

// Custom timeout
const { getRepo } = setupRepositoryTest({
  createRepository: (prisma) => new MyRepository(prisma),
  beforeAllTimeout: 90000,  // 90s instead of default 60s
})
```

**When to use standard pattern vs helper**:
- **Use helper**: New tests, straightforward repositories (recommended)
- **Use standard**: Complex setup, multiple repositories in one test, advanced scenarios

## Critical Points

### 1. Dependency Injection is Required ⚠️
Repositories MUST accept PrismaClient in constructor:
```typescript
// In repository
constructor(prismaClient?: PrismaClient) {
  this.prisma = prismaClient || defaultPrisma
}
```

Tests inject testcontainers client:
```typescript
repo = new XxxRepository(testDb.prisma!)
```

**Why**: The global prisma singleton from `@sentinel/database` connects to production/dev DB. Tests need isolated test containers.

### 2. Always Use `this.prisma` in Repositories
```typescript
// ❌ Wrong - uses global singleton
async findById(id: string) {
  return await prisma.user.findUnique({ where: { id } })
}

// ✅ Correct - uses injected instance
async findById(id: string) {
  return await this.prisma.user.findUnique({ where: { id } })
}
```

**Error symptom**: `password authentication failed for user "placeholder"` means a method is using global `prisma` instead of `this.prisma`.

### 3. Database Reset Pattern
TestDatabase.reset() uses PostgreSQL-specific pattern to disable FK checks during TRUNCATE:
```typescript
await prisma.$executeRawUnsafe('SET session_replication_role = replica;')
// Truncate all tables except 'migrations'
await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;')
```

This is **PostgreSQL-specific** and won't work with other databases.

## Common Test Patterns

### CRUD Operations
```typescript
describe('create', () => {
  it('creates with valid data')
  it('throws on duplicate unique key')
  it('throws on FK violation')
  it('validates required fields')
})

describe('findById', () => {
  it('finds existing entity')
  it('returns null when not found')
})

describe('update', () => {
  it('updates existing entity')
  it('throws when entity not found')
  it('throws on duplicate key constraint')
})

describe('delete', () => {
  it('deletes existing entity')
  it('throws when entity not found')
})
```

### Filters and Queries
```typescript
describe('findAll', () => {
  it('returns all without filters')
  it('filters by single field')
  it('combines multiple filters')
  it('returns empty array when no matches')
  it('applies sorting correctly')
})

describe('pagination', () => {
  it('returns first page with default size')
  it('returns specific page')
  it('handles last page correctly')
  it('returns empty for out-of-bounds page')
})
```

### Transactions
```typescript
describe('bulkCreate', () => {
  it('creates multiple entities', async () => {
    const count = await repo.bulkCreate([input1, input2])
    expect(count).toBe(2)

    // Verify via direct query
    const all = await testDb.prisma!.entity.findMany()
    expect(all.length).toBe(2)
  })

  it('rolls back entire transaction on error', async () => {
    await createEntity(testDb.prisma!, { uniqueField: 'EXISTING' })

    const inputs = [
      { uniqueField: 'NEW' },
      { uniqueField: 'EXISTING' }  // Will violate unique constraint
    ]

    await expect(repo.bulkCreate(inputs)).rejects.toThrow()

    // Verify nothing was created (rollback worked)
    const all = await testDb.prisma!.entity.findMany()
    expect(all.length).toBe(1)  // Only the pre-existing one
  })
})
```

### Using Factories
```typescript
it('should find entity with relations', async () => {
  const division = await testDb.prisma!.division.findFirst()
  const member = await createMember(testDb.prisma!, {
    divisionId: division!.id,
    firstName: 'John',
    lastName: 'Doe'
  })
  const badge = await createBadge(testDb.prisma!, {
    assignedToId: member.id,
    assignmentType: 'member'
  })

  const found = await repo.findById(member.id)

  expect(found!.division.id).toBe(division!.id)
  expect(found!.badge!.id).toBe(badge.id)
})
```

## Troubleshooting

### "password authentication failed for user 'placeholder'"
**Cause**: Repository method using global `prisma` instead of `this.prisma`.

**Fix**: Search repository file for `await prisma.` or ` prisma.` and replace with `await this.prisma.` or ` this.prisma.`.

```bash
# Find offending lines
grep -n "prisma\." src/repositories/xxx-repository.ts | grep -v "this.prisma"

# Auto-fix (carefully review after)
sed -i 's/await prisma\./await this.prisma./g' xxx-repository.ts
sed -i 's/ prisma\./ this.prisma./g' xxx-repository.ts
```

### "container removal already in progress"
**Cause**: Docker container timing issue with `.withReuse()` flag.

**Fix**: Usually resolves on test retry. If persistent:
```bash
# List all test containers
docker ps -a | grep postgres

# Force remove stuck container
docker rm -f <container-id>
```

### "the database system is shutting down"
**Cause**: Tests trying to access container that's stopping.

**Fix**: Usually intermittent. Check that `afterAll` isn't called too early or that tests aren't running in wrong order.

### Schema Changes Not Reflected
**Cause**: Prisma client needs regeneration after schema changes.

**Fix**:
```bash
cd packages/database
pnpm prisma generate
# Tests will auto-apply new schema via db push
```

### UUID Validation Errors
**Cause**: Test using invalid UUID strings like `"non-existent-id"`.

**Fix**: Use valid UUIDs in tests:
```typescript
// ❌ Bad
const found = await repo.findById('non-existent-id')

// ✅ Good
const found = await repo.findById('a0ebe404-c5d1-41c6-b2da-0f647e49057f')
```

## Coverage Targets

| Metric | Minimum | Good | Excellent |
|--------|---------|------|-----------|
| Lines | 70% | 80% | 90%+ |
| Functions | 70% | 80% | 90%+ |
| Branches | 65% | 75% | 85%+ |

Run coverage:
```bash
pnpm test --coverage
pnpm test xxx-repository.test.ts --coverage  # Single file
```

Coverage thresholds are enforced in `vitest.config.ts` and will fail CI if not met.

## Performance Notes

- **Container startup**: ~5s with reuse, ~30s fresh
- **Schema application**: ~2-3s via `db push`
- **Test isolation**: ~100-200ms per `reset()` call
- **Typical test file**: 30-60s for 30-50 tests

## Running Tests

```bash
# All tests
pnpm test

# Single file
pnpm test member-repository.test.ts

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage

# Run without watch (CI mode)
pnpm test --run
```

## Example: Complete Repository Test

See [member-repository.test.ts](integration/repositories/member-repository.test.ts) (45 tests, 79% coverage) or [badge-repository.test.ts](integration/repositories/badge-repository.test.ts) (29 tests, 97% coverage) for comprehensive examples.
