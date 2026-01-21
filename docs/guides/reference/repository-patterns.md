---
type: reference
title: "Repository Patterns Reference"
status: published
created: 2026-01-20
last_updated: 2026-01-20
ai:
  priority: high
  context_load: on-demand
  triggers:
    - repository patterns
    - crud patterns
    - pagination
    - transactions
    - filtering
  token_budget: 1500
version: "1.0.0"
stability: stable
related_refs:
  - Prisma Documentation
  - TypeScript Types Reference
---

# Repository Patterns Reference

**Version:** 1.0.0

**Stability:** Stable

**Quick Links:**
- [CRUD Patterns](#crud-patterns)
- [Filtering & Queries](#filtering-patterns)
- [Pagination](#pagination-pattern)
- [Transactions](#transaction-patterns)
- [Relations](#relationship-patterns)
- [Performance](#performance-patterns)

---

## Overview

**What:** Complete reference of common repository patterns used in Sentinel

**Purpose:** Provides copy-paste ready patterns for standard repository operations

**Use cases:**
- Implementing CRUD operations
- Adding filtering and search
- Implementing pagination
- Working with transactions
- Optimizing query performance

---

## CRUD Patterns

### Create (Single Record)

```typescript
async create(data: Prisma.MemberCreateInput): Promise<Member> {
  return await this.prisma.member.create({
    data,
  })
}
```

**When to use:** Creating single record with validated input

**Returns:** Created record with generated ID

**Throws:** Unique constraint violation, FK violation

---

### Create (Bulk)

```typescript
async createMany(items: Array<Prisma.MemberCreateInput>): Promise<number> {
  const result = await this.prisma.member.createMany({
    data: items,
    skipDuplicates: true,  // Optional: ignore duplicates
  })
  return result.count
}
```

**When to use:** Creating multiple records at once

**Returns:** Number of records created

**Note:** `createMany` doesn't return created records

---

### Read (By ID)

```typescript
async findById(id: string): Promise<Member | null> {
  return await this.prisma.member.findUnique({
    where: { id },
  })
}
```

**When to use:** Fetching single record by primary key

**Returns:** Record or `null` if not found

---

### Read (By Unique Field)

```typescript
async findByServiceNumber(serviceNumber: string): Promise<Member | null> {
  return await this.prisma.member.findUnique({
    where: { serviceNumber },
  })
}
```

**When to use:** Fetching by any field with unique constraint

**Returns:** Record or `null`

---

### Read (All)

```typescript
async findAll(): Promise<Member[]> {
  return await this.prisma.member.findMany({
    orderBy: { createdAt: 'desc' },
  })
}
```

**When to use:** Fetching all records (use cautiously on large tables)

**Returns:** Array of records (may be empty)

**Warning:** Use pagination for tables with >1000 records

---

### Update

```typescript
async update(
  id: string,
  data: Prisma.MemberUpdateInput
): Promise<Member> {
  return await this.prisma.member.update({
    where: { id },
    data,
  })
}
```

**When to use:** Updating single record

**Returns:** Updated record

**Throws:** `RecordNotFoundError` if ID doesn't exist

---

### Delete

```typescript
async delete(id: string): Promise<Member> {
  return await this.prisma.member.delete({
    where: { id },
  })
}
```

**When to use:** Deleting single record

**Returns:** Deleted record

**Throws:** `RecordNotFoundError` if ID doesn't exist

---

## Filtering Patterns

### Simple Filter

```typescript
async findByStatus(status: string): Promise<Member[]> {
  return await this.prisma.member.findMany({
    where: { status },
    orderBy: { lastName: 'asc' },
  })
}
```

**When to use:** Filtering by single field

---

### Multiple Filters (AND)

```typescript
async findMembers(filter: {
  divisionId?: string
  status?: string
  rank?: string
}): Promise<Member[]> {
  const where: Prisma.MemberWhereInput = {}

  if (filter.divisionId) where.divisionId = filter.divisionId
  if (filter.status) where.status = filter.status
  if (filter.rank) where.rank = filter.rank

  return await this.prisma.member.findMany({
    where,
    orderBy: { lastName: 'asc' },
  })
}
```

**When to use:** Multiple filters with AND logic

---

### OR Filters

```typescript
async search(query: string): Promise<Member[]> {
  return await this.prisma.member.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { serviceNumber: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { lastName: 'asc' },
  })
}
```

**When to use:** Search across multiple fields

**Note:** `mode: 'insensitive'` for case-insensitive search

---

### Complex Filters (AND + OR)

```typescript
async findMembers(filter: {
  divisionId?: string
  search?: string
  statuses?: string[]
}): Promise<Member[]> {
  const where: Prisma.MemberWhereInput = {}

  // AND conditions
  if (filter.divisionId) {
    where.divisionId = filter.divisionId
  }

  if (filter.statuses && filter.statuses.length > 0) {
    where.status = { in: filter.statuses }
  }

  // OR conditions for search
  if (filter.search) {
    where.OR = [
      { firstName: { contains: filter.search, mode: 'insensitive' } },
      { lastName: { contains: filter.search, mode: 'insensitive' } },
    ]
  }

  return await this.prisma.member.findMany({ where })
}
```

**When to use:** Combining AND and OR logic

---

### Date Range Filters

```typescript
async findByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Member[]> {
  return await this.prisma.member.findMany({
    where: {
      createdAt: {
        gte: startDate,  // Greater than or equal
        lte: endDate,    // Less than or equal
      },
    },
  })
}
```

**When to use:** Filtering by date range

---

## Pagination Pattern

### Standard Pagination

```typescript
async findPaginated(
  params: { page: number; limit: number },
  filter?: { status?: string }
): Promise<{
  items: Member[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const skip = (params.page - 1) * params.limit
  const take = params.limit

  // Build where clause
  const where: Prisma.MemberWhereInput = filter || {}

  // Parallel query for count and items
  const [total, items] = await Promise.all([
    this.prisma.member.count({ where }),
    this.prisma.member.findMany({
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

**When to use:** Any table with >100 records

**Returns:** Paginated results with metadata

**Performance:** Uses `Promise.all` for parallel queries

---

### Cursor-Based Pagination

```typescript
async findPaginatedCursor(
  params: { cursor?: string; limit: number }
): Promise<{
  items: Member[]
  nextCursor: string | null
}> {
  const items = await this.prisma.member.findMany({
    take: params.limit + 1,  // Fetch one extra
    cursor: params.cursor ? { id: params.cursor } : undefined,
    orderBy: { createdAt: 'desc' },
  })

  const hasMore = items.length > params.limit
  const results = hasMore ? items.slice(0, -1) : items
  const nextCursor = hasMore ? results[results.length - 1].id : null

  return {
    items: results,
    nextCursor,
  }
}
```

**When to use:** Real-time feeds, infinite scroll

**Benefits:** More efficient for large datasets

---

## Transaction Patterns

### Simple Transaction

```typescript
async transferBadge(
  badgeId: string,
  fromMemberId: string,
  toMemberId: string
): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // Unassign from old member
    await tx.badge.update({
      where: { id: badgeId },
      data: { assignedToId: null },
    })

    // Assign to new member
    await tx.badge.update({
      where: { id: badgeId },
      data: { assignedToId: toMemberId },
    })
  })
}
```

**When to use:** Multiple operations that must succeed or fail together

**Note:** All operations use `tx` not `this.prisma` inside transaction

---

### Bulk Transaction (Update)

```typescript
async bulkUpdate(
  updates: Array<{ id: string; data: Prisma.MemberUpdateInput }>
): Promise<Member[]> {
  return await this.prisma.$transaction(async (tx) => {
    const results: Member[] = []

    for (const { id, data } of updates) {
      // Use update (singular) for rollback on missing record
      const result = await tx.member.update({
        where: { id },
        data,
      })
      results.push(result)
    }

    return results
  })
}
```

**When to use:** Updating multiple records atomically

**Critical:** Use `update` not `updateMany` for rollback on errors

---

### Transaction with Validation

```typescript
async createWithValidation(
  data: Prisma.MemberCreateInput
): Promise<Member> {
  return await this.prisma.$transaction(async (tx) => {
    // Check business rule
    const existing = await tx.member.count({
      where: { divisionId: data.divisionId },
    })

    if (existing >= 100) {
      throw new Error('Division at capacity')
    }

    // Create if valid
    return await tx.member.create({ data })
  })
}
```

**When to use:** Operations requiring validation before create/update

---

## Relationship Patterns

### Include Relations

```typescript
async findByIdWithRelations(id: string): Promise<Member | null> {
  return await this.prisma.member.findUnique({
    where: { id },
    include: {
      division: true,           // Include full division object
      badges: true,             // Include all badges
      checkins: {               // Include with filter
        where: { scannedAt: { gte: new Date('2024-01-01') } },
        orderBy: { scannedAt: 'desc' },
        take: 10,
      },
    },
  })
}
```

**When to use:** Fetching record with related data

---

### Select Specific Fields

```typescript
async findByIdMinimal(id: string) {
  return await this.prisma.member.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      division: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}
```

**When to use:** Optimizing payload size, avoiding unnecessary data

---

### Nested Filters

```typescript
async findByDivisionName(divisionName: string): Promise<Member[]> {
  return await this.prisma.member.findMany({
    where: {
      division: {
        name: divisionName,
      },
    },
  })
}
```

**When to use:** Filtering by related entity fields

---

## Performance Patterns

### Parallel Queries

```typescript
async getStats(divisionId: string) {
  const [total, active, inactive] = await Promise.all([
    this.prisma.member.count({ where: { divisionId } }),
    this.prisma.member.count({ where: { divisionId, status: 'ACTIVE' } }),
    this.prisma.member.count({ where: { divisionId, status: 'INACTIVE' } }),
  ])

  return { total, active, inactive }
}
```

**When to use:** Multiple independent queries

**Performance:** Executes queries in parallel (2-3x faster)

---

### Select Optimization

```typescript
async findAllMinimal(): Promise<Array<{ id: string; name: string }>> {
  return await this.prisma.member.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  })
}
```

**When to use:** Large result sets, list views

**Performance:** Reduces payload size significantly

---

### Index Hints (via orderBy)

```typescript
async findByStatus(status: string): Promise<Member[]> {
  return await this.prisma.member.findMany({
    where: { status },
    orderBy: { status: 'asc' },  // Uses status index
  })
}
```

**When to use:** Leveraging database indexes

**Note:** Ensure indexed fields in Prisma schema

---

## Counting Patterns

### Simple Count

```typescript
async count(): Promise<number> {
  return await this.prisma.member.count()
}
```

---

### Count with Filter

```typescript
async countByStatus(status: string): Promise<number> {
  return await this.prisma.member.count({
    where: { status },
  })
}
```

---

### Count with Relations

```typescript
async countWithBadges(): Promise<number> {
  return await this.prisma.member.count({
    where: {
      badges: {
        some: {
          status: 'ACTIVE',
        },
      },
    },
  })
}
```

---

## Error Handling Patterns

### With Null Check

```typescript
async findByIdOrThrow(id: string): Promise<Member> {
  const member = await this.prisma.member.findUnique({ where: { id } })

  if (!member) {
    throw new Error(`Member with ID ${id} not found`)
  }

  return member
}
```

**When to use:** When null is an error condition

---

### Prisma Error Handling

```typescript
import { Prisma } from '@prisma/client'

async create(data: Prisma.MemberCreateInput): Promise<Member> {
  try {
    return await this.prisma.member.create({ data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('Member with this service number already exists')
      }
      if (error.code === 'P2003') {
        throw new Error('Invalid division ID')
      }
    }
    throw error
  }
}
```

**When to use:** Converting Prisma errors to user-friendly messages

**Common codes:**
- `P2002` - Unique constraint violation
- `P2003` - Foreign key constraint violation
- `P2025` - Record not found

---

## Related Documentation

**Reference:**
- [Troubleshooting Repositories](troubleshooting-repositories.md)
- [Prisma Query Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

**How-to Guides:**
- [How to Add a Repository](../howto/add-repository.md)
- [How to Migrate a Repository](../howto/migrate-repository.md)

**Explanation:**
- [Repository Pattern Explained](../explanation/repository-pattern.md)

---

**Last Updated:** 2026-01-20
