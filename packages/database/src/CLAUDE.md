# CLAUDE Rules: Database Usage Patterns

Query patterns and performance optimization for Prisma, Kysely, and raw SQL.

---

## Scope
Applies when writing database queries in: `apps/backend/src/repositories/`, `apps/backend/src/services/`

## Non-Negotiables (MUST / MUST NOT)

**Tool Selection**:
- MUST use Prisma Client for simple CRUD operations
- MUST use Kysely for complex queries with joins/aggregates (2x faster than Prisma)
- MUST use raw SQL `COPY` for bulk imports > 1000 rows (3x faster than ORM)

**Prisma Requirements**:
- MUST use `findUnique` for unique lookups (NOT `findFirst`)
- MUST use `select` to limit fields in production (NOT select all)
- MUST check for null on relations before accessing properties
- MUST handle Prisma error codes:
  - P2002 → Unique constraint violation
  - P2003 → FK violation
  - P2025 → Record not found

**Indexing**:
- MUST index all foreign keys
- MUST index frequently filtered columns (WHERE, ORDER BY)
- MUST NOT index rarely queried columns or small tables (< 1000 rows)

**Transactions**:
- MUST use transactions for multi-operation logic
- MUST use raw SQL for data migrations (separate from schema migrations)

## Defaults (SHOULD)

**Performance**:
- SHOULD use `relationLoadStrategy: 'join'` (2-3x faster, avoids N+1)
- SHOULD use includes instead of separate queries
- SHOULD use connection pooling (10 connections per instance)
- SHOULD monitor query performance in development

**Migrations**:
- SHOULD backup before production migrations
- SHOULD test on staging first
- SHOULD never edit applied migrations

## Workflow

**When choosing query tool**:
1. Simple CRUD? → Use Prisma Client
2. Complex joins/aggregates? → Use Kysely
3. Bulk import > 1000 rows? → Use raw SQL COPY
4. Need < 100ms query? → Use Kysely

**When optimizing query**:
1. Enable Prisma query logging: `log: ['query']`
2. Identify slow queries (> 100ms)
3. Add indexes for WHERE/JOIN/ORDER BY columns
4. Use `select` to limit fields
5. Consider Kysely for complex queries

## Quick Reference

### Tool Decision Tree

| Task | Use | Target Performance |
|------|-----|-------------------|
| Create table/model | Prisma schema | N/A |
| Run migration | Prisma Migrate | N/A |
| Simple CRUD | Prisma Client | < 10ms |
| Complex query (joins/aggregates) | Kysely | < 100ms |
| Bulk import (CSV) | Raw SQL `COPY` | < 5s for 10K rows |

### Prisma Best Practices

```typescript
// ✅ Good - Use findUnique for unique lookups
await prisma.member.findUnique({ where: { id: '123' } })

// ❌ Bad - Don't use findFirst for unique lookups
await prisma.member.findFirst({ where: { id: '123' } })

// ✅ Good - Select specific fields
await prisma.member.findMany({
  select: { id: true, firstName: true, lastName: true }
})

// ❌ Bad - Don't select all fields in production
await prisma.member.findMany()

// ✅ Good - Check for null on relations
if (member.division) {
  console.log(member.division.name)
}

// ❌ Bad - Don't access relations without null check
console.log(member.division.name)  // TypeError if null!
```

### Kysely for Complex Queries

```typescript
import { db } from '@/db/kysely'

// Complex reporting query
const report = await db
  .selectFrom('attendance_records as ar')
  .innerJoin('members as m', 'm.id', 'ar.member_id')
  .select(['m.id', sql<number>`COUNT(ar.id)`.as('total')])
  .where('ar.timestamp', '>=', startDate)
  .groupBy('m.id')
  .execute()
```

### Bulk Import Pattern

```typescript
// For CSV imports > 1000 rows
const stream = client.query(copyFrom(`
  COPY attendance_temp (member_id, timestamp, event_type)
  FROM STDIN WITH (FORMAT csv, HEADER true)
`))
await pipeline(fileStream, stream)

// Validate + insert with FK check
await client.query(`
  INSERT INTO attendance_records (id, member_id, timestamp, event_type, created_at)
  SELECT gen_random_uuid(), member_id, timestamp, event_type, NOW()
  FROM attendance_temp
  WHERE member_id IN (SELECT id FROM members)
`)
```

### Connection Pooling

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
```

Recommended: 10 connections per server instance

### Query Logging (Development)

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

---

**Performance Targets**: Simple CRUD < 10ms, Complex joins < 100ms, Aggregations < 200ms, Bulk import (10K rows) < 5s

**Related**: @packages/database/CLAUDE.md (database package), @packages/database/prisma/CLAUDE.md (schema), @apps/backend/src/repositories/CLAUDE.md (repositories)
