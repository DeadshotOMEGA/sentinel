# CLAUDE Rules: Repository Layer

## Scope

Applies when editing files under: `apps/backend/src/repositories/`

## Non-Negotiables (MUST / MUST NOT)

**Dependency Injection**:

- MUST accept optional `PrismaClient` parameter in constructor
- MUST use `this.prisma` in ALL methods (NEVER global `prisma`)
- MUST NOT use global `prisma` in `Promise.all`, transactions, or arrow functions

**Testing**:

- MUST achieve 90%+ test coverage for repository layer
- MUST use integration tests with real database (Testcontainers)
- MUST test all CRUD operations (create, read, update, delete)
- MUST test error paths (not found, duplicates, FK violations)

**Transactions**:

- MUST use `update` (singular) in transactions for rollback on missing records
- MUST NOT use `updateMany` in transactions (returns count=0, no rollback)

**Type Safety**:

- MUST use Prisma types (`Prisma.EntityCreateInput`, `Prisma.EntityUpdateInput`)
- MUST NOT use `any` types

## Defaults (SHOULD)

**Code Structure**:

- SHOULD follow standard repository template (see Quick Reference below)
- SHOULD order methods: constructor, find\*, create, update, delete, count
- SHOULD add JSDoc comments for public methods

**Testing**:

- SHOULD test filters, pagination, and relationships
- SHOULD test transactions rollback correctly
- SHOULD use `setupRepositoryTest` helper for cleaner tests

**Performance**:

- SHOULD use `Promise.all` for parallel queries
- SHOULD use `select` to limit returned fields when appropriate
- SHOULD add indexes for frequently filtered fields

## Workflow

**When creating new repository**:

1. Use standard template from Quick Reference
2. Add entity-specific query methods
3. Create integration test file
4. Verify 90%+ coverage
5. Check no `prisma.` (only `this.prisma.`)

**When migrating from develop branch**:

1. Extract file using `git show origin/develop:backend/src/db/repositories/file.ts`
2. Update imports to `@sentinel/database`
3. Add dependency injection constructor
4. Replace all `prisma.` with `this.prisma.`
5. Remove Bun-specific code
6. Fix TypeScript strict mode errors
7. Write integration tests
8. See: [How to Migrate a Repository](../../../../docs/guides/howto/migrate-repository.md)

**When tests fail with authentication error**:

1. Search for `prisma.` in repository file
2. Replace with `this.prisma.`
3. Check inside `Promise.all`, transactions, and arrow functions
4. See: [Troubleshooting Repositories](../../../../docs/guides/reference/troubleshooting-repositories.md)

## Quick Reference

**Standard Repository Template**:

```typescript
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Prisma } from '@prisma/client'

export class EntityRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findById(id: string) {
    return await this.prisma.entity.findUnique({ where: { id } })
  }

  async create(data: Prisma.EntityCreateInput) {
    return await this.prisma.entity.create({ data })
  }

  async update(id: string, data: Prisma.EntityUpdateInput) {
    return await this.prisma.entity.update({ where: { id }, data })
  }

  async delete(id: string) {
    return await this.prisma.entity.delete({ where: { id } })
  }
}
```

**Integration Test Template**:

```typescript
import { describe, it, expect } from 'vitest'
import { setupRepositoryTest } from '../../helpers/repository-test-setup'
import { EntityRepository } from '../../../src/repositories/entity-repository'

describe('EntityRepository Integration Tests', () => {
  const { getRepo, getPrisma } = setupRepositoryTest({
    createRepository: (prisma) => new EntityRepository(prisma),
  })

  describe('create', () => {
    it('should create entity with valid data', async () => {
      const repo = getRepo()
      const result = await repo.create({ name: 'Test' })

      expect(result).toBeDefined()
      expect(result.name).toBe('Test')
    })

    it('should throw on duplicate unique field', async () => {
      const repo = getRepo()
      const prisma = getPrisma()

      await prisma.entity.create({ data: { code: 'DUP' } })
      await expect(repo.create({ code: 'DUP' })).rejects.toThrow()
    })
  })
})
```

**Documentation**:

- [Repository Pattern Explained](../../../../docs/guides/explanation/repository-pattern.md) - Concepts and design decisions
- [How to Add a Repository](../../../../docs/guides/howto/add-repository.md) - Step-by-step guide
- [How to Migrate a Repository](../../../../docs/guides/howto/migrate-repository.md) - Migrate from develop branch
- [Repository Patterns Reference](../../../../docs/guides/reference/repository-patterns.md) - Common patterns (CRUD, pagination, transactions)
- [Troubleshooting Repositories](../../../../docs/guides/reference/troubleshooting-repositories.md) - Error messages and fixes
- [Testing Standards](../../tests/CLAUDE.md) - Integration testing with Testcontainers
- [Database Package](../../../../packages/database/CLAUDE.md) - Prisma configuration
- [Database Query Patterns](../../../../packages/database/src/CLAUDE.md) - Query optimization

**Completed Repositories** (examples):

- [member-repository.ts](member-repository.ts) - 78% coverage, 45 tests
- [badge-repository.ts](badge-repository.ts) - 97% coverage, 29 tests
