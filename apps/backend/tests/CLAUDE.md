# CLAUDE Rules: Backend Testing

Integration-first testing with Testcontainers, Vitest, and Supertest.

---

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
- MUST inject PrismaClient via repository constructor:
  ```typescript
  export class MyRepository {
    private prisma: PrismaClient
    constructor(prismaClient?: PrismaClient) {
      this.prisma = prismaClient || defaultPrisma
    }
  }
  ```
- MUST use `this.prisma` in ALL repository methods (NEVER global `prisma`)
- MUST NOT use `await prisma.` or ` prisma.` (causes auth errors in tests)

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
- SHOULD use Testcontainers `.withReuse()` for faster startup (5s vs 30s)

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

## Quick Reference

### Standard Repository Test Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { MyRepository } from '../../../src/repositories/my-repository'

describe('MyRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: MyRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new MyRepository(testDb.prisma!)  // Inject test client
  }, 60000)

  afterAll(async () => await testDb.stop())
  beforeEach(async () => await testDb.reset())

  it('should create entity', async () => {
    const result = await repo.create({ name: 'Test' })
    expect(result.id).toBeDefined()
  })
})
```

### Simplified Pattern with Helper

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

### Route Test Pattern

```typescript
import request from 'supertest'
import { app } from '@/app.js'

describe('GET /api/members/:id', () => {
  it('should return 200 with member data', async () => {
    await request(app)
      .get('/api/members/123')
      .expect(200)
  })

  it('should return 404 when not found', async () => {
    await request(app)
      .get('/api/members/invalid-id')
      .expect(404)
  })
})
```

### Troubleshooting

#### password authentication failed for user "placeholder"

**Cause**: Route or repository using global `prisma` instead of injected client.

**Fix for Repositories**: Search and replace in repository file:
```bash
# Find offending lines
grep -n "prisma\." src/repositories/xxx-repository.ts | grep -v "this.prisma"

# Replace (verify before committing)
sed -i 's/await prisma\./await this.prisma./g' xxx-repository.ts
sed -i 's/ prisma\./ this.prisma./g' xxx-repository.ts
```

**Fix for Routes**: Use database service instead of global prisma:
```bash
# Check for issues
./scripts/check-prisma-imports.sh

# Manual fix
# Replace: import { prisma } from '@sentinel/database'
# With: import { getPrismaClient } from '../lib/database.js'

# Replace: await prisma.
# With: await getPrismaClient().
```

**Prevention**: Run `pnpm check:prisma` before committing (automated via pretest script)

#### P2002 Unique constraint failed (Testcontainers)

**Cause**: Multiple test files running in parallel, all trying to apply schema to same reused container simultaneously.

**Fix**: Set `fileParallelism: false` in vitest.config.ts:
```typescript
export default defineConfig({
  test: {
    fileParallelism: false, // Run test files sequentially
    // ... rest of config
  }
})
```

**Why**: Testcontainers with container reuse requires sequential file execution to prevent race conditions during schema application.

### Running Tests

```bash
pnpm test                    # All tests
pnpm test member-repository  # Specific file
pnpm test --watch            # Watch mode
pnpm test --coverage         # With coverage
```

### Docker Container Management

**Test Container Isolation**:

Test containers are labeled with `sentinel.test=true` to ensure they NEVER interfere with:
- Development containers (Grafana, Loki, Prometheus)
- Production containers
- Other project containers

**Labels Applied**:
```typescript
{
  'sentinel.test': 'true',           // Marks as test container
  'sentinel.project': 'backend-tests', // Identifies project
  'sentinel.purpose': 'integration-testing' // Purpose
}
```

**Safe Cleanup Commands**:

```bash
# Interactive cleanup (asks for confirmation)
pnpm test:clean

# Force cleanup (no confirmation)
pnpm test:clean:force

# Manual verification (show only test containers)
docker ps -a --filter "label=sentinel.test=true"
```

**What Gets Cleaned**:
- ✅ Test PostgreSQL containers (labeled `sentinel.test=true`)

**What's PROTECTED**:
- ✅ Grafana (no `sentinel.test` label)
- ✅ Loki (no `sentinel.test` label)
- ✅ Prometheus (no `sentinel.test` label)
- ✅ Development database (different label or no label)
- ✅ Any other project containers

**When to Clean**:
- Test failures with "constraint already exists" errors
- "Container removal already in progress" errors
- After switching branches with schema changes
- To force fresh test container creation

---

**Testing Infrastructure**: TestDatabase class manages PostgreSQL containers, factory functions generate test data. See helpers/ for implementation details.

**Coverage Enforcement**: Thresholds configured in vitest.config.ts, fail CI if not met.

**Related**: @apps/backend/src/repositories/CLAUDE.md (repository patterns), @packages/database/CLAUDE.md (database setup)
