# Repository Layer

Sentinel backend uses the **Repository Pattern** for data access, providing a clean abstraction over Prisma ORM operations.

## Critical Rules

### 1. ALWAYS Use Dependency Injection

**REQUIRED PATTERN**:
```typescript
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

export class MyRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  // All methods use this.prisma (NEVER global prisma)
  async findById(id: string) {
    return await this.prisma.myModel.findUnique({ where: { id } })
  }
}
```

**Why?** Tests inject testcontainers database. Using global `prisma` causes authentication errors in tests.

### 2. ALWAYS Use this.prisma (Never Global prisma)

❌ **WRONG** (will fail in tests):
```typescript
async findAll() {
  return await prisma.member.findMany()  // Uses global singleton
}
```

✅ **CORRECT**:
```typescript
async findAll() {
  return await this.prisma.member.findMany()  // Uses injected client
}
```

**Common Mistake**: Missing `this.` in `Promise.all`:
```typescript
// ❌ WRONG
const [total, items] = await Promise.all([
  prisma.myModel.count(),     // Missing this.
  prisma.myModel.findMany()   // Missing this.
])

// ✅ CORRECT
const [total, items] = await Promise.all([
  this.prisma.myModel.count(),
  this.prisma.myModel.findMany()
])
```

### 3. Test Coverage Required

**Minimum Coverage Target**: 90% for repository layer

Every repository must have integration tests covering:
- CRUD operations (create, read, update, delete)
- Filtering and queries
- Relationships and includes
- Error handling (not found, duplicates, constraints)
- Transactions (if applicable)

See [apps/backend/tests/CLAUDE.md](../../../tests/CLAUDE.md) for testing patterns.

## Repository Structure

### Standard Repository Template

```typescript
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Prisma } from '@prisma/client'

/**
 * MyModelRepository - Data access layer for MyModel
 *
 * Handles all database operations for MyModel entity.
 * Uses dependency injection for testability.
 */
export class MyModelRepository {
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
    return await this.prisma.myModel.findUnique({
      where: { id },
    })
  }

  /**
   * Find all records with optional filtering
   */
  async findAll(filter?: { status?: string }) {
    return await this.prisma.myModel.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Create new record
   */
  async create(data: Prisma.MyModelCreateInput) {
    return await this.prisma.myModel.create({
      data,
    })
  }

  /**
   * Update existing record
   * @throws NotFoundError if record doesn't exist
   */
  async update(id: string, data: Prisma.MyModelUpdateInput) {
    return await this.prisma.myModel.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete record
   * @throws NotFoundError if record doesn't exist
   */
  async delete(id: string) {
    return await this.prisma.myModel.delete({
      where: { id },
    })
  }

  /**
   * Count records matching filter
   */
  async count(filter?: { status?: string }) {
    return await this.prisma.myModel.count({
      where: filter,
    })
  }
}
```

## Migration Pattern

### Extracting from Develop Branch

**Step 1: Extract File**
```bash
# Extract repository from develop branch
git show origin/develop:backend/src/db/repositories/my-repository.ts > \
  apps/backend/src/repositories/my-repository.ts
```

**Step 2: Update Imports**
```typescript
// ❌ Old (develop branch)
import { prisma } from '@/db/prisma'
import { Member } from '@prisma/client'

// ✅ New (rebuild)
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Member } from '@prisma/client'
```

**Step 3: Add Dependency Injection**
```typescript
// ❌ Old (develop branch)
export class MyRepository {
  async findById(id: string) {
    return await prisma.myModel.findUnique({ where: { id } })
  }
}

// ✅ New (rebuild)
export class MyRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findById(id: string) {
    return await this.prisma.myModel.findUnique({ where: { id } })
  }
}
```

**Step 4: Replace All `prisma.` with `this.prisma.`**
```bash
# Search for occurrences (should return 0 after fixing)
rg "await prisma\." apps/backend/src/repositories/my-repository.ts
rg " prisma\." apps/backend/src/repositories/my-repository.ts
```

**Step 5: Remove Bun-Specific Code**
```typescript
// ❌ Remove Bun.sleep
await Bun.sleep(1000)

// ✅ Use setTimeout with Promise
await new Promise(resolve => setTimeout(resolve, 1000))
```

**Step 6: Fix TypeScript Strict Mode Errors**
```typescript
// ❌ Implicit any
function process(data) { ... }

// ✅ Explicit types
function process(data: MyType) { ... }

// ❌ Potentially null
const result = await findById(id)
return result.name

// ✅ Null-safe
const result = await findById(id)
if (!result) throw new Error('Not found')
return result.name
```

**Step 7: Write Integration Tests**

Create `apps/backend/tests/integration/repositories/my-repository.test.ts` covering all methods.

See [Testing Section](#testing-requirements) below.

## Common Patterns

### Pattern 1: Simple CRUD

```typescript
export class SimpleRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  async create(data: CreateInput) {
    return await this.prisma.model.create({ data })
  }

  async findById(id: string) {
    return await this.prisma.model.findUnique({ where: { id } })
  }

  async update(id: string, data: UpdateInput) {
    return await this.prisma.model.update({ where: { id }, data })
  }

  async delete(id: string) {
    return await this.prisma.model.delete({ where: { id } })
  }
}
```

### Pattern 2: Filtering with Type-Safe Queries

```typescript
interface FindMembersFilter {
  divisionId?: string
  status?: 'ACTIVE' | 'INACTIVE'
  search?: string
}

async findMembers(filter: FindMembersFilter) {
  const where: Prisma.MemberWhereInput = {}

  if (filter.divisionId) {
    where.divisionId = filter.divisionId
  }

  if (filter.status) {
    where.status = filter.status
  }

  if (filter.search) {
    where.OR = [
      { firstName: { contains: filter.search, mode: 'insensitive' } },
      { lastName: { contains: filter.search, mode: 'insensitive' } },
      { serviceNumber: { contains: filter.search, mode: 'insensitive' } },
    ]
  }

  return await this.prisma.member.findMany({ where })
}
```

### Pattern 3: Pagination

```typescript
interface PaginationParams {
  page: number
  limit: number
}

async findPaginated(params: PaginationParams, filter?: FilterType) {
  const skip = (params.page - 1) * params.limit
  const take = params.limit

  const where = this.buildWhereClause(filter)

  const [total, items] = await Promise.all([
    this.prisma.model.count({ where }),
    this.prisma.model.findMany({
      where,
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

### Pattern 4: Complex Queries with Relations

```typescript
async findWithRelations(id: string) {
  return await this.prisma.member.findUnique({
    where: { id },
    include: {
      division: true,
      badges: {
        where: { status: 'ACTIVE' },
        orderBy: { assignedAt: 'desc' },
      },
      checkins: {
        take: 10,
        orderBy: { scannedAt: 'desc' },
      },
    },
  })
}
```

### Pattern 5: Transactions

```typescript
async bulkUpdate(updates: Array<{ id: string; data: UpdateInput }>) {
  return await this.prisma.$transaction(async (tx) => {
    const results = []

    for (const { id, data } of updates) {
      // ⚠️ Use update (singular) not updateMany
      // update throws on missing record → rollback
      // updateMany returns {count: 0} → no rollback
      const result = await tx.model.update({
        where: { id },
        data,
      })
      results.push(result)
    }

    return results
  })
}
```

**Critical**: Use `update` (singular) when you want transactions to rollback on missing records. Use `updateMany` when you want to ignore missing records.

### Pattern 6: Batch Operations

```typescript
async createMany(items: CreateInput[]) {
  return await this.prisma.model.createMany({
    data: items,
    skipDuplicates: true,  // Optional: ignore duplicates
  })
}

async deleteMany(ids: string[]) {
  return await this.prisma.model.deleteMany({
    where: {
      id: { in: ids },
    },
  })
}
```

## Error Handling

### Pattern: Explicit Error Throwing

```typescript
async findByIdOrThrow(id: string) {
  const result = await this.prisma.model.findUnique({ where: { id } })

  if (!result) {
    throw new Error(`Model with ID ${id} not found`)
  }

  return result
}
```

### Pattern: Return Null (Caller Handles)

```typescript
async findById(id: string) {
  return await this.prisma.model.findUnique({ where: { id } })
  // Returns null if not found - caller decides how to handle
}
```

### Pattern: Prisma Error Handling

```typescript
import { Prisma } from '@prisma/client'

async create(data: CreateInput) {
  try {
    return await this.prisma.model.create({ data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('Unique constraint violation')
      }
      if (error.code === 'P2025') {
        throw new Error('Record not found')
      }
      if (error.code === 'P2003') {
        throw new Error('Foreign key constraint violation')
      }
    }
    throw error
  }
}
```

## Testing Requirements

Every repository must have comprehensive integration tests.

### Test File Structure

```typescript
// apps/backend/tests/integration/repositories/my-repository.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { TestDatabase } from '../../helpers/testcontainers'
import { MyRepository } from '../../../src/repositories/my-repository'

describe('MyRepository Integration Tests', () => {
  const testDb = new TestDatabase()
  let repo: MyRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new MyRepository(testDb.prisma!)
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  describe('findById', () => {
    it('should return record when it exists', async () => {
      const created = await repo.create({ name: 'Test' })
      const found = await repo.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
    })

    it('should return null when record does not exist', async () => {
      const found = await repo.findById('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('create', () => {
    it('should create record with valid data', async () => {
      const result = await repo.create({ name: 'Test' })

      expect(result).toBeDefined()
      expect(result.name).toBe('Test')
      expect(result.id).toBeDefined()
    })

    it('should throw on duplicate unique field', async () => {
      await repo.create({ uniqueField: 'value' })

      await expect(
        repo.create({ uniqueField: 'value' })
      ).rejects.toThrow()
    })

    it('should throw on invalid foreign key', async () => {
      await expect(
        repo.create({ foreignId: 'non-existent' })
      ).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('should update existing record', async () => {
      const created = await repo.create({ name: 'Original' })
      const updated = await repo.update(created.id, { name: 'Updated' })

      expect(updated.name).toBe('Updated')
    })

    it('should throw when record does not exist', async () => {
      await expect(
        repo.update('non-existent-id', { name: 'Updated' })
      ).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete existing record', async () => {
      const created = await repo.create({ name: 'Test' })
      await repo.delete(created.id)

      const found = await repo.findById(created.id)
      expect(found).toBeNull()
    })

    it('should throw when record does not exist', async () => {
      await expect(
        repo.delete('non-existent-id')
      ).rejects.toThrow()
    })
  })

  // Add more test suites for each method...
})
```

### What to Test

For every repository, test:

1. **Create Operations**
   - ✅ Valid data creates record
   - ✅ Returns created record with ID
   - ✅ Throws on duplicate unique fields
   - ✅ Throws on invalid foreign keys
   - ✅ Throws on missing required fields

2. **Read Operations**
   - ✅ Find by ID returns record
   - ✅ Find by ID returns null for non-existent
   - ✅ Find all returns empty array when no records
   - ✅ Find all returns all records
   - ✅ Filters work correctly
   - ✅ Relations are included when specified

3. **Update Operations**
   - ✅ Updates existing record
   - ✅ Returns updated record
   - ✅ Throws on non-existent record
   - ✅ Throws on duplicate unique fields

4. **Delete Operations**
   - ✅ Deletes existing record
   - ✅ Throws on non-existent record
   - ✅ Cascades/restricts as expected

5. **Filtering/Queries**
   - ✅ Each filter parameter works
   - ✅ Multiple filters combine correctly
   - ✅ Case-insensitive search works
   - ✅ Pagination works correctly

6. **Transactions** (if applicable)
   - ✅ Commits on success
   - ✅ Rolls back on error
   - ✅ Atomic operations verified

7. **Complex Queries**
   - ✅ Relations loaded correctly
   - ✅ Nested filters work
   - ✅ Ordering works

See [apps/backend/tests/CLAUDE.md](../../../tests/CLAUDE.md) for full testing guide.

## Repository List

**Status**: Phase 1.3 of rebuild plan

| Repository | Status | Tests | Coverage |
|------------|--------|-------|----------|
| member-repository.ts | ✅ Complete | 45/45 | 78.96% |
| badge-repository.ts | ✅ Complete | 29/29 | 97.31% |
| checkin-repository.ts | ⏳ Pending | - | - |
| visitor-repository.ts | ⏳ Pending | - | - |
| admin-user-repository.ts | ⏳ Pending | - | - |
| audit-repository.ts | ⏳ Pending | - | - |
| division-repository.ts | ⏳ Pending | - | - |
| event-repository.ts | ⏳ Pending | - | - |
| tag-repository.ts | ⏳ Pending | - | - |
| member-status-repository.ts | ⏳ Pending | - | - |
| member-type-repository.ts | ⏳ Pending | - | - |
| visit-type-repository.ts | ⏳ Pending | - | - |
| badge-status-repository.ts | ⏳ Pending | - | - |
| list-item-repository.ts | ⏳ Pending | - | - |

**Target**: 90%+ coverage on repository layer

## Troubleshooting

### Error: "password authentication failed for user 'placeholder'"

**Cause**: Repository method using global `prisma` instead of `this.prisma`.

**Fix**:
1. Search repository file for `await prisma.` or ` prisma.`
2. Replace with `await this.prisma.` or ` this.prisma.`
3. Check `Promise.all` calls - common location for this bug

**Example Fix**:
```typescript
// ❌ Before
const [total, items] = await Promise.all([
  prisma.model.count(),
  prisma.model.findMany()
])

// ✅ After
const [total, items] = await Promise.all([
  this.prisma.model.count(),
  this.prisma.model.findMany()
])
```

### Error: Transaction Not Rolling Back

**Cause**: Using `updateMany` instead of `update` in transactions.

**Explanation**:
- `updateMany` returns `{count: 0}` for non-existent records (no error)
- `update` throws `RecordNotFoundError` for non-existent records (error → rollback)

**Fix**:
```typescript
// ❌ Wrong - doesn't rollback on missing record
await tx.model.updateMany({
  where: { id },
  data
})

// ✅ Correct - rolls back on missing record
await tx.model.update({
  where: { id },
  data
})
```

### Error: Type Error on PrismaClient Import

**Cause**: Importing PrismaClient as value instead of type.

**Fix**:
```typescript
// ❌ Wrong
import { PrismaClient } from '@sentinel/database'

// ✅ Correct
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
```

### Low Test Coverage

**Cause**: Missing tests for error cases, filters, or edge cases.

**Fix**:
1. Run coverage report: `pnpm test:coverage`
2. Check uncovered lines in report
3. Add tests for:
   - All error paths (not found, duplicates, FK violations)
   - All filter parameters
   - All method branches

**Example**: If `findByStatus` is at 50% coverage:
```typescript
// Probably only testing happy path
it('should find records by status', async () => {
  const results = await repo.findByStatus('ACTIVE')
  expect(results.length).toBeGreaterThan(0)
})

// Add edge cases:
it('should return empty array for non-existent status', async () => {
  const results = await repo.findByStatus('NON_EXISTENT')
  expect(results).toEqual([])
})

it('should handle null status', async () => {
  const results = await repo.findByStatus(null)
  expect(results).toBeDefined()
})
```

## Performance Considerations

### Use Parallel Queries

```typescript
// ❌ Slow - sequential
const total = await this.prisma.model.count()
const items = await this.prisma.model.findMany()

// ✅ Fast - parallel
const [total, items] = await Promise.all([
  this.prisma.model.count(),
  this.prisma.model.findMany()
])
```

### Use Select for Large Objects

```typescript
// ❌ Fetches all fields (slow if large columns exist)
const members = await this.prisma.member.findMany()

// ✅ Only fetch needed fields
const members = await this.prisma.member.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
  }
})
```

### Use Includes Wisely

```typescript
// ❌ N+1 query problem
const members = await this.prisma.member.findMany()
for (const member of members) {
  const badges = await this.prisma.badge.findMany({
    where: { memberId: member.id }
  })
}

// ✅ Single query with include
const members = await this.prisma.member.findMany({
  include: { badges: true }
})
```

### Batch Operations

```typescript
// ❌ Slow - multiple queries
for (const item of items) {
  await this.prisma.model.create({ data: item })
}

// ✅ Fast - single batch query
await this.prisma.model.createMany({ data: items })
```

## Enum Repositories

Special repositories for configurable enumeration tables (MemberStatus, MemberType, VisitType, BadgeStatus, ListItem).

### Purpose

Enum tables provide runtime-configurable lookup values instead of hardcoded enums:
- **Flexibility**: Add/edit values without code changes
- **UI Integration**: Colors, descriptions for display
- **Referential Integrity**: FK constraints prevent invalid values
- **Usage Tracking**: Track which records use each enum value

### Standard Enum Repository Pattern

```typescript
export class MemberStatusRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  // Core CRUD operations
  async findAll(): Promise<MemberStatusEnum[]> { /* ... */ }
  async findById(id: string): Promise<MemberStatusEnum | null> { /* ... */ }
  async findByCode(code: string): Promise<MemberStatusEnum | null> { /* ... */ }
  async create(data: CreateInput): Promise<MemberStatusEnum> { /* ... */ }
  async update(id: string, data: UpdateInput): Promise<MemberStatusEnum> { /* ... */ }

  // Deletion with protection
  async delete(id: string): Promise<void> {
    const usageCount = await this.getUsageCount(id)
    if (usageCount > 0) {
      throw new Error(`Cannot delete: ${usageCount} records still use this value`)
    }
    // ... delete
  }

  // Critical: Track FK usage
  async getUsageCount(id: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM members
      WHERE member_status_id = ${id}::uuid
    `
    return Number(rows[0]?.count ?? 0)
  }
}
```

### Key Characteristics

1. **findByCode Method**: Query by code (programmatic access) not just ID
2. **Delete Protection**: Prevent deletion if values are in use
3. **getUsageCount**: Query parent tables with FK relationships
4. **Standard Fields**: All enum tables have: id, code, name, description, color, timestamps

### Schema Relationship Pattern

Enum tables link to parent tables via foreign keys:

```prisma
// Enum table
model MemberStatus {
  id          String    @id @default(dbgenerated("gen_random_uuid()"))
  code        String    @unique
  name        String
  description String?
  color       String?
  members     Member[]  // ⚠️ Reverse relation required
}

// Parent table
model Member {
  memberStatusId  String?       @map("member_status_id") @db.Uuid
  memberStatusRef MemberStatus? @relation(fields: [memberStatusId], references: [id])
}
```

**Critical**: Both sides must define the relation:
- Parent: FK field + relation field
- Child: Reverse relation array

### GetUsageCount Implementation

Must query all parent tables that reference the enum:

```typescript
// Simple case: One parent table
async getUsageCount(id: string): Promise<number> {
  const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM members
    WHERE member_status_id = ${id}::uuid
  `
  return Number(rows[0]?.count ?? 0)
}

// Complex case: Multiple parent tables or conditions
async getUsageCount(id: string): Promise<number> {
  const item = await this.findById(id)
  if (!item) return 0

  let count = 0

  // Check badges table
  const badgeRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM badges WHERE badge_status_id = ${id}::uuid
  `
  count += Number(badgeRows[0]?.count ?? 0)

  // Check other tables...
  return count
}
```

### ListItem Repository (Complex Enum)

ListItem is a generic enum table supporting multiple list types:

```typescript
export class ListItemRepository {
  // Standard methods apply to all list types
  async findAll(): Promise<ListItemEnum[]> { /* ... */ }

  // List-type-specific queries
  async findByType(listType: string): Promise<ListItemEnum[]> {
    const rows = await this.prisma.$queryRaw`
      SELECT * FROM list_items
      WHERE list_type = ${listType}
      ORDER BY display_order, name
    `
    return rows.map(toListItem)
  }

  async findByTypeAndCode(listType: string, code: string): Promise<ListItemEnum | null> {
    // Unique constraint on [listType, code]
  }

  // Usage varies by list type
  async getUsageCount(id: string): Promise<number> {
    const item = await this.findById(id)
    if (!item) return 0

    switch (item.listType) {
      case 'rank':
        // Query members.rank (string column, not FK)
        return this.countInColumn('members', 'rank', item.name)
      case 'event_role':
        return this.countInColumn('event_attendees', 'role', item.name)
      // ... more cases
    }
  }

  // Display order management (drag-and-drop)
  async reorder(listType: string, items: Array<{ id: string; displayOrder: number }>) {
    // Batch update display_order values
  }
}
```

**ListItem characteristics**:
- Multiple list types in one table (ranks, roles, messes, MOCs)
- Unique constraint on `[listType, code]`
- `displayOrder` field for UI sorting
- `isSystem` flag to protect built-in values
- Usage counting varies by list type (some use string columns, not FKs)

### Testing Enum Repositories

Required test coverage:

```typescript
describe('EnumRepository', () => {
  // CRUD
  test('create with all fields')
  test('create without optional fields')
  test('throw on duplicate code')

  // Read
  test('findAll returns ordered by name')
  test('findById returns existing record')
  test('findById returns null when not found')
  test('findByCode returns existing record')
  test('findByCode is case-sensitive')

  // Update
  test('update single field')
  test('update multiple fields')
  test('throw when updating non-existent')
  test('throw when updating with empty data')
  test('throw on duplicate code')

  // Delete
  test('delete existing record')
  test('throw when deleting non-existent')
  test('prevent deletion when in use')  // ⚠️ Critical test

  // Usage counting
  test('getUsageCount returns 0 for unused')
  test('getUsageCount returns correct count')
  test('getUsageCount returns 0 for non-existent')

  // Edge cases
  test('handle special characters')
  test('handle long names')
  test('handle color formats')
})
```

### Migration Strategy

When adding enum tables to existing codebase:

1. **Create enum table** with all standard fields
2. **Add nullable FK** to parent table (`member_status_id`)
3. **Keep legacy string column** temporarily (`status`)
4. **Add reverse relation** to enum table
5. **Populate enum table** with existing unique values
6. **Data migration**: Copy string values to FK references
7. **Make FK required**, remove string column (future)

This allows gradual migration without breaking existing code.

### Common Issues

**Issue**: "Cannot delete: X records still use this value"

**Cause**: Trying to delete enum value that's referenced by parent records.

**Solution**:
- Update parent records to use different value first
- Or: Accept that value cannot be deleted while in use

**Issue**: getUsageCount returns 0 but delete still fails

**Cause**:
- FK column doesn't exist yet (getUsageCount stubbed to return 0)
- Or: Checking wrong parent table

**Solution**:
- Verify FK column exists in schema: `member_status_id`
- Check all parent tables that might reference this enum
- Use database tools to find actual references: `SELECT * FROM members WHERE member_status_id = 'uuid'`

**Issue**: Enum values not appearing in UI

**Cause**: No seed data, empty table

**Solution**: Create seed script or manual SQL inserts for default values

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Testing Guide](../../../tests/CLAUDE.md)
- [Database Package](../../../../packages/database/CLAUDE.md)
- [Rebuild Plan](../../../../../.claude/plans/imperative-rolling-chipmunk.md)
