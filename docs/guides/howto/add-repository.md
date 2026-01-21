---
type: howto
title: "How to Add a New Repository"
status: published
created: 2026-01-20
last_updated: 2026-01-20
ai:
  priority: high
  context_load: on-demand
  triggers:
    - add repository
    - create repository
    - new repository
    - repository template
  token_budget: 1200
goal: "Create a new repository following Sentinel's standard pattern"
difficulty: medium
estimated_time: "30-45 minutes"
prerequisites:
  - Understanding of Repository Pattern
  - Prisma schema knowledge
  - TypeScript basics
related_tasks:
  - How to Migrate a Repository
  - How to Write Integration Tests
---

# How to Add a New Repository

**Goal:** Create a fully-tested repository for a new database entity

**Difficulty:** Medium

**Time:** ~30-45 minutes

**Prerequisites:**
- Basic understanding of [Repository Pattern](../explanation/repository-pattern.md)
- Entity exists in [Prisma schema](../../../packages/database/prisma/schema.prisma)
- Familiarity with TypeScript

---

## When to Use This Guide

**Use this guide when you need to:**
- Create data access layer for a new entity
- Add database operations for a new feature
- Implement CRUD operations following Sentinel standards

**Don't use this guide for:**
- Modifying existing repositories → See repository code directly
- Adding business logic → Use service layer instead
- Creating enum repositories → See [Enum Repositories section](#enum-repositories)

---

## Quick Solution

**For experienced users:**

```bash
# 1. Create repository file
touch apps/backend/src/repositories/my-entity-repository.ts

# 2. Copy standard template (see below)
# 3. Create test file
touch apps/backend/tests/integration/repositories/my-entity-repository.test.ts

# 4. Run tests
pnpm test my-entity-repository.test.ts
```

**For detailed walkthrough, continue reading.**

---

## Prerequisites Check

Before starting, verify you have:

- [ ] Entity defined in Prisma schema
  ```bash
  grep -A 10 "model MyEntity" packages/database/prisma/schema.prisma
  ```
  Expected: Model definition with fields and relations

- [ ] Prisma client regenerated
  ```bash
  cd packages/database && pnpm prisma generate
  ```
  Expected: "Generated Prisma Client"

- [ ] Understanding of entity relationships
  ```bash
  # Check foreign keys and relations
  ```
  Expected: Know which entities this entity references

---

## Step-by-Step Instructions

### Step 1: Create Repository File

**What:** Create the repository class file in the repositories directory

**Why:** Centralizes all data operations for the entity

**How:**

```bash
touch apps/backend/src/repositories/my-entity-repository.ts
```

**Expected result:**
Empty file in `apps/backend/src/repositories/`

---

### Step 2: Implement Standard Repository Template

**What:** Add the repository class with dependency injection

**Why:** Enables testability and follows Sentinel standards

**How:**

```typescript
// apps/backend/src/repositories/my-entity-repository.ts
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Prisma } from '@prisma/client'

/**
 * MyEntityRepository - Data access layer for MyEntity
 *
 * Handles all database operations for MyEntity entity.
 * Uses dependency injection for testability.
 */
export class MyEntityRepository {
  private prisma: PrismaClient

  /**
   * @param prismaClient - Optional Prisma client (injected in tests)
   */
  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find record by ID
   */
  async findById(id: string) {
    return await this.prisma.myEntity.findUnique({
      where: { id },
    })
  }

  /**
   * Find all records
   */
  async findAll() {
    return await this.prisma.myEntity.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Create new record
   */
  async create(data: Prisma.MyEntityCreateInput) {
    return await this.prisma.myEntity.create({
      data,
    })
  }

  /**
   * Update existing record
   * @throws NotFoundError if record doesn't exist
   */
  async update(id: string, data: Prisma.MyEntityUpdateInput) {
    return await this.prisma.myEntity.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete record
   * @throws NotFoundError if record doesn't exist
   */
  async delete(id: string) {
    return await this.prisma.myEntity.delete({
      where: { id },
    })
  }
}
```

**Expected result:**
Repository with basic CRUD operations

**Troubleshooting:**
- If TypeScript errors on `prisma.myEntity`, run `pnpm prisma generate`
- If import errors, check `@sentinel/database` package is built

---

### Step 3: Add Business-Specific Methods

**What:** Add methods specific to your entity's use cases

**Why:** Encapsulates common query patterns

**How:**

```typescript
// Add to MyEntityRepository class

/**
 * Find by unique field
 */
async findByCode(code: string) {
  return await this.prisma.myEntity.findUnique({
    where: { code },
  })
}

/**
 * Find with relations
 */
async findByIdWithRelations(id: string) {
  return await this.prisma.myEntity.findUnique({
    where: { id },
    include: {
      relatedEntity: true,
      otherRelation: {
        select: { id: true, name: true },
      },
    },
  })
}

/**
 * Find with filtering
 */
async findByStatus(status: string) {
  return await this.prisma.myEntity.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Count records
 */
async count(filter?: { status?: string }) {
  return await this.prisma.myEntity.count({
    where: filter,
  })
}
```

**Expected result:**
Repository with entity-specific query methods

---

### Step 4: Add Pagination Support (Optional)

**What:** Add paginated query method if entity has many records

**Why:** Prevents loading too much data at once

**How:**

```typescript
/**
 * Find paginated records
 */
async findPaginated(
  params: { page: number; limit: number },
  filter?: { status?: string }
) {
  const skip = (params.page - 1) * params.limit
  const take = params.limit

  const [total, items] = await Promise.all([
    this.prisma.myEntity.count({ where: filter }),
    this.prisma.myEntity.findMany({
      where: filter,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    items,
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  }
}
```

**Expected result:**
Pagination method that returns items and metadata

---

### Step 5: Create Integration Tests

**What:** Create comprehensive test file for the repository

**Why:** Ensures repository works correctly with real database

**How:**

```bash
touch apps/backend/tests/integration/repositories/my-entity-repository.test.ts
```

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupRepositoryTest } from '../../helpers/repository-test-setup'
import { MyEntityRepository } from '../../../src/repositories/my-entity-repository'

describe('MyEntityRepository Integration Tests', () => {
  const { getRepo, getPrisma } = setupRepositoryTest({
    createRepository: (prisma) => new MyEntityRepository(prisma),
  })

  describe('create', () => {
    it('should create entity with valid data', async () => {
      const repo = getRepo()
      const result = await repo.create({
        code: 'TEST001',
        name: 'Test Entity',
      })

      expect(result).toBeDefined()
      expect(result.code).toBe('TEST001')
      expect(result.name).toBe('Test Entity')
    })

    it('should throw on duplicate unique field', async () => {
      const repo = getRepo()
      const prisma = getPrisma()

      await prisma.myEntity.create({
        data: { code: 'DUP', name: 'Original' },
      })

      await expect(
        repo.create({ code: 'DUP', name: 'Duplicate' })
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find existing record', async () => {
      const repo = getRepo()
      const prisma = getPrisma()

      const created = await prisma.myEntity.create({
        data: { code: 'FIND', name: 'Findable' },
      })

      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
    })

    it('should return null when not found', async () => {
      const repo = getRepo()
      const found = await repo.findById('non-existent-uuid')

      expect(found).toBeNull()
    })
  })

  describe('update', () => {
    it('should update existing record', async () => {
      const repo = getRepo()
      const prisma = getPrisma()

      const created = await prisma.myEntity.create({
        data: { code: 'UPD', name: 'Original' },
      })

      const updated = await repo.update(created.id, {
        name: 'Updated',
      })

      expect(updated.name).toBe('Updated')
      expect(updated.code).toBe('UPD') // Unchanged
    })

    it('should throw when record not found', async () => {
      const repo = getRepo()

      await expect(
        repo.update('non-existent-uuid', { name: 'Updated' })
      ).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete existing record', async () => {
      const repo = getRepo()
      const prisma = getPrisma()

      const created = await prisma.myEntity.create({
        data: { code: 'DEL', name: 'Deletable' },
      })

      await repo.delete(created.id)

      const found = await prisma.myEntity.findUnique({
        where: { id: created.id },
      })

      expect(found).toBeNull()
    })

    it('should throw when record not found', async () => {
      const repo = getRepo()

      await expect(repo.delete('non-existent-uuid')).rejects.toThrow()
    })
  })
})
```

**Expected result:**
Test file with CRUD coverage

---

### Step 6: Run Tests and Verify Coverage

**What:** Run tests and check coverage meets 90% threshold

**Why:** Ensures repository quality and catches bugs

**How:**

```bash
pnpm test my-entity-repository.test.ts --coverage
```

**Expected result:**
```
✓ MyEntityRepository Integration Tests (15 tests)
  ✓ create (2 tests)
  ✓ findById (2 tests)
  ✓ update (2 tests)
  ✓ delete (2 tests)

Coverage: 92% (target: 90%)
```

**Troubleshooting:**
- If coverage < 90%, add tests for uncovered branches
- If tests fail with "password authentication failed", check for `prisma.` instead of `this.prisma`

---

## Complete Example

**Full working repository with all patterns:**

See [member-repository.ts](../../../apps/backend/src/repositories/member-repository.ts) for a complete example with:
- CRUD operations
- Filtering and search
- Pagination
- Relationships
- Transaction support
- 90%+ test coverage

---

## Common Variations

### Variation 1: Enum Repository

**When to use:** For configurable enumeration tables

**How it differs:** Adds `findByCode` and `getUsageCount` methods

**See:** [Enum Repositories section in Repository CLAUDE.md](../../../apps/backend/src/repositories/CLAUDE.md#enum-repositories)

---

### Variation 2: Repository with Transactions

**When to use:** For operations requiring multiple database writes

**Example:**
```typescript
async bulkCreate(items: Array<Prisma.MyEntityCreateInput>) {
  return await this.prisma.$transaction(async (tx) => {
    const results = []
    for (const item of items) {
      const result = await tx.myEntity.create({ data: item })
      results.push(result)
    }
    return results
  })
}
```

---

## Troubleshooting

### Problem: "password authentication failed for user 'placeholder'"

**Symptoms:**
- Tests fail with authentication error
- Error mentions "placeholder" user

**Causes:**
- Using global `prisma` instead of `this.prisma` in a method

**Solutions:**

**Try this first:**
```bash
# Search for incorrect usage
grep -n "await prisma\." apps/backend/src/repositories/my-entity-repository.ts
```

**If that doesn't work:**
Check inside `Promise.all`:
```typescript
// ❌ WRONG
const [total, items] = await Promise.all([
  prisma.myEntity.count(),
  prisma.myEntity.findMany()
])

// ✅ CORRECT
const [total, items] = await Promise.all([
  this.prisma.myEntity.count(),
  this.prisma.myEntity.findMany()
])
```

**Still stuck?** See [Troubleshooting Repositories](../reference/troubleshooting-repositories.md)

---

### Problem: TypeScript errors on Prisma types

**Symptoms:**
- "Property 'myEntity' does not exist on type 'PrismaClient'"
- Import errors for Prisma types

**Solutions:**

```bash
# Regenerate Prisma client
cd packages/database
pnpm prisma generate

# Rebuild database package
pnpm build

# Restart TypeScript server in IDE
```

---

## Best Practices

**✅ Do:**
- Use `this.prisma` in ALL methods
- Write tests for all methods (90%+ coverage)
- Use Prisma types (`Prisma.MyEntityCreateInput`)
- Add JSDoc comments for public methods
- Order methods: find*, create, update, delete
- Use parallel queries (`Promise.all`) when possible

**❌ Don't:**
- Use global `prisma` in methods (breaks tests)
- Add business logic (use services instead)
- Return query builders (return data)
- Skip error handling tests
- Forget to test edge cases (null, duplicates, FK violations)

---

## Related Tasks

**Before this task:**
- [Define entity in Prisma schema](../../../packages/database/prisma/schema.prisma)
- [Run Prisma generate](../reference/commands.md#database)

**After this task:**
- [Create routes using repository](../howto/add-route.md)
- [Add repository to service layer](../howto/add-service.md)

**Similar tasks:**
- [How to Migrate a Repository](migrate-repository.md)
- [How to Write Integration Tests](../../cross-cutting/testing/howto-integration-tests.md)

---

## Related Documentation

**How-to Guides:**
- [How to Migrate a Repository](migrate-repository.md)

**Reference:**
- [Repository Patterns](../reference/repository-patterns.md)
- [Troubleshooting Repositories](../reference/troubleshooting-repositories.md)

**Explanation:**
- [Repository Pattern Explained](../explanation/repository-pattern.md)

**Code:**
- [Repository CLAUDE.md](../../../apps/backend/src/repositories/CLAUDE.md)
- [Example Repositories](../../../apps/backend/src/repositories/)

---

**Last Updated:** 2026-01-20
