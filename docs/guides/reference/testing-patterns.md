---
type: reference
title: Testing Patterns
status: current
created: 2026-01-23
last_updated: 2026-01-23
---

# Backend Testing Patterns

Code examples and patterns for writing tests in `apps/backend/tests/`.

## Standard Repository Test Pattern

Full manual setup with Testcontainers:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { MyRepository } from '../../../src/repositories/my-repository'

describe('MyRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: MyRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new MyRepository(testDb.prisma!) // Inject test client
  }, 60000)

  afterAll(async () => await testDb.stop())
  beforeEach(async () => await testDb.reset())

  it('should create entity', async () => {
    const result = await repo.create({ name: 'Test' })
    expect(result.id).toBeDefined()
  })
})
```

## Simplified Pattern with Helper

Using the `setupRepositoryTest` helper to reduce boilerplate:

```typescript
import { setupRepositoryTest, createTestData } from '../../helpers/repository-test-setup'
import { MyRepository } from '../../../src/repositories/my-repository'

describe('MyRepository', () => {
  const { getRepo, getPrisma } = setupRepositoryTest({
    createRepository: (prisma) => new MyRepository(prisma),
  })

  it('should create entity', async () => {
    const repo = getRepo()
    const result = await repo.create({ name: 'Test' })
    expect(result.id).toBeDefined()
  })
})
```

## Route Test Pattern

Testing Express routes with Supertest:

```typescript
import request from 'supertest'
import { app } from '@/app.js'

describe('GET /api/members/:id', () => {
  it('should return 200 with member data', async () => {
    await request(app).get('/api/members/123').expect(200)
  })

  it('should return 404 when not found', async () => {
    await request(app).get('/api/members/invalid-id').expect(404)
  })
})
```

## Dependency Injection Pattern

How to structure repositories for testability:

```typescript
export class MyRepository {
  private prisma: PrismaClient
  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }
}
```

## Troubleshooting Commands

### Password Authentication Failed

When tests fail with `password authentication failed for user "placeholder"`:

Find offending lines in repository:

```bash
grep -n "prisma\." src/repositories/xxx-repository.ts | grep -v "this.prisma"
```

Replace `prisma.` with `this.prisma.`:

```bash
sed -i 's/await prisma\./await this.prisma./g' xxx-repository.ts
sed -i 's/ prisma\./ this.prisma./g' xxx-repository.ts
```

Check for route issues:

```bash
./scripts/check-prisma-imports.sh
```

Manual route fix:

```bash
# Replace: import { prisma } from '@sentinel/database'
# With: import { getPrismaClient } from '../lib/database.js'

# Replace: await prisma.
# With: await getPrismaClient().
```

Prevention - run before committing:

```bash
pnpm check:prisma
```

### P2002 Unique Constraint Failed

When Testcontainers fail with constraint errors during parallel execution:

Update `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    fileParallelism: false, // Run test files sequentially
    // ... rest of config
  },
})
```

This prevents race conditions when multiple test files try to apply schema to reused containers simultaneously.

## Running Tests

Common test commands:

```bash
pnpm test                    # All tests
pnpm test member-repository  # Specific file
pnpm test --watch            # Watch mode
pnpm test --coverage         # With coverage report
```

## Docker Container Cleanup

Test containers are labeled with `sentinel.test=true` to prevent interfering with development or production containers.

Labels applied to test containers:

```typescript
{
  'sentinel.test': 'true',           // Marks as test container
  'sentinel.project': 'backend-tests', // Identifies project
  'sentinel.purpose': 'integration-testing' // Purpose
}
```

Safe cleanup commands:

```bash
# Interactive cleanup (asks for confirmation)
pnpm test:clean

# Force cleanup (no confirmation)
pnpm test:clean:force

# Manual verification (show only test containers)
docker ps -a --filter "label=sentinel.test=true"
```

Protected containers (never cleaned):

- Grafana (no `sentinel.test` label)
- Loki (no `sentinel.test` label)
- Prometheus (no `sentinel.test` label)
- Development database (different label or no label)
- Any other project containers

When to clean up:

- Test failures with "constraint already exists" errors
- "Container removal already in progress" errors
- After switching branches with schema changes
- To force fresh test container creation
