---
type: concept
title: "Testcontainers"
status: published
created: 2026-01-19
last_updated: 2026-01-19
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - testcontainers
    - test database
    - docker container
    - postgresql container
  token_budget: 250
---

# Testcontainers

**Definition:** Library that provides lightweight, throwaway instances of databases and services in Docker containers for testing.

**Package:** `@testcontainers/postgresql`

---

## Purpose

Enables integration tests to run against **real PostgreSQL** instead of mocks or in-memory databases.

---

## Key Features

### 1. Real Database
- Actual PostgreSQL running in Docker
- Same behavior as production
- Catches database-specific issues (constraints, triggers, functions)

### 2. Isolation
- Each test suite gets fresh container
- No shared state between test runs
- Parallel test execution safe

### 3. Automatic Cleanup
- Container destroyed after tests finish
- No manual cleanup needed
- No port conflicts

### 4. Container Reuse
- Reuse containers across test runs with `.withReuse()`
- Faster subsequent runs
- Reduced Docker overhead

---

## Sentinel Implementation

```typescript
// apps/backend/tests/helpers/testcontainers.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient } from '@sentinel/database'

export class TestDatabase {
  private container?: StartedPostgreSqlContainer
  public prisma?: PrismaClient

  async start() {
    // Start PostgreSQL container with reuse
    this.container = await new PostgreSqlContainer('postgres:17-alpine')
      .withReuse()  // ⚡ Reuse container across runs
      .start()

    const connectionString = this.container.getConnectionUri()

    // Create Prisma client
    this.prisma = new PrismaClient({
      datasources: { db: { url: connectionString } }
    })

    await this.prisma.$connect()

    // Push schema (faster than migrations for tests)
    await execSync('pnpm prisma db push --skip-generate', {
      env: { DATABASE_URL: connectionString }
    })
  }

  async reset() {
    // Truncate all tables for test isolation
    const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `
    for (const { tablename } of tables) {
      await this.prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tablename}" CASCADE`
      )
    }
  }

  async stop() {
    await this.prisma?.$disconnect()
    await this.container?.stop()
  }
}
```

---

## Usage Pattern

```typescript
describe('Repository Integration Tests', () => {
  const testDb = new TestDatabase()

  beforeAll(async () => {
    await testDb.start()  // Start container once
  }, 60000)  // 60s timeout for container startup

  afterAll(async () => {
    await testDb.stop()  // Cleanup
  })

  beforeEach(async () => {
    await testDb.reset()  // Fresh state per test
  })

  it('should test with real database', async () => {
    // Tests use testDb.prisma
  })
})
```

---

## Performance Tips

### Use Container Reuse
```typescript
.withReuse()  // ⚡ Reuse container across test runs
```

**First run:** ~20-30s (container download + start)
**Subsequent runs:** ~5-10s (reuse existing container)

### Use `db push` Not Migrations
```bash
pnpm prisma db push --skip-generate  # Fast (< 5s)
# vs
pnpm prisma migrate deploy  # Slow (20s+)
```

### Parallel Test Execution
Testcontainers handles port allocation automatically - tests can run in parallel safely.

---

## Common Issues

### Slow First Run
**Symptom:** First test run takes 30+ seconds

**Cause:** Downloading PostgreSQL Docker image

**Fix:** Use `.withReuse()` and keep container running between sessions

### Tests Timeout
**Symptom:** `beforeAll` timeout errors

**Cause:** Container startup takes > 10s default timeout

**Fix:** Increase timeout: `beforeAll(async () => { ... }, 60000)`

### Port Conflicts
**Symptom:** "Port already in use" errors

**Cause:** Previous container still running

**Fix:** Use `.withReuse()` or manually stop containers:
```bash
docker ps | grep postgres
docker stop <container-id>
```

---

## Related Concepts

- [Integration Testing](integration-testing.md) - Why use real databases
- [Repository Pattern](repository-pattern.md) - What we're testing
- [Test Factories](test-factories.md) - Creating test data

---

## Official Documentation

- [Testcontainers Node](https://node.testcontainers.org/)
- [PostgreSQL Module](https://node.testcontainers.org/modules/postgresql/)
