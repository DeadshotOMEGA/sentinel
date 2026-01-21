---
paths:
  - "**/repositories/**"
  - "**/prisma/**"
  - "**/*.prisma"
---

# Database Patterns

Hybrid ORM strategy: Prisma for schema, Kysely for performance, Raw SQL for bulk ops.

## Decision Tree

| Task | Use | Why |
|------|-----|-----|
| Create table/model | Prisma schema | Best DX for schema evolution |
| Run migration | Prisma Migrate | Type-safe migrations |
| Simple CRUD | Prisma Client | Clean API, auto-generated types |
| Complex query (joins/aggregates) | Kysely | 2x faster than Prisma (50ms vs 110ms) |
| Bulk import (CSV) | Raw SQL `COPY` | 3x faster than any ORM |

## Prisma Requirements

**Schema Best Practices**:
- ✅ UUIDs for primary keys (NOT auto-increment)
- ✅ Enable `relationLoadStrategy: 'join'` (2-3x faster, avoids N+1)
- ✅ Index foreign keys + frequently filtered columns
- ✅ Auto-update timestamps with `@updatedAt`

**Example**:
```prisma
model Personnel {
  id        String   @id @default(uuid())
  firstName String
  lastName  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([lastName, firstName])  // Composite index for search
}
```

**Error Handling** (Prisma error codes):
- `P2002` - Unique constraint violation → throw clear error
- `P2003` - FK violation → throw clear error
- `P2025` - Record not found → return null

## Kysely Usage

**Use for**: Complex reporting queries, dynamic WHERE clauses, performance-critical reads (< 100ms)

**Pattern**:
```typescript
const report = await db
  .selectFrom('attendance_records as ar')
  .innerJoin('personnel as p', 'p.id', 'ar.personnel_id')
  .select(['p.id', sql<number>`COUNT(ar.id)`.as('total')])
  .where('ar.timestamp', '>=', startDate)
  .groupBy('p.id')
  .execute()
```

**Type Generation**: `pnpm kysely-codegen --out-file src/db/kysely-types.ts`

## Bulk Import Pattern

**For CSV imports > 1000 rows**:
```typescript
// 1. Create temp table
// 2. COPY from CSV
const stream = client.query(copyFrom(`
  COPY attendance_temp (personnel_id, timestamp, event_type)
  FROM STDIN WITH (FORMAT csv, HEADER true)
`))
await pipeline(fileStream, stream)

// 3. Validate + insert into main table with FK check
await client.query(`
  INSERT INTO attendance_records (id, personnel_id, timestamp, event_type, created_at)
  SELECT gen_random_uuid(), personnel_id, timestamp, event_type, NOW()
  FROM attendance_temp
  WHERE personnel_id IN (SELECT id FROM personnel)
`)
```

## Migration Workflow

**Development**:
```bash
pnpm prisma migrate dev --name add_table  # Create + apply migration
pnpm prisma migrate reset                 # Reset database (destructive)
```

**Production**:
```bash
pnpm prisma migrate deploy    # Apply pending migrations
pnpm prisma generate          # Regenerate Prisma Client
```

**Best Practices**:
- ⚠️ Always backup before production migrations
- ⚠️ Test on staging first
- ⚠️ Never edit applied migrations
- ⚠️ Use raw SQL for data migrations (separate from schema migrations)

## Indexing Strategy

**When to add indexes**:
- ✅ Foreign keys (Prisma adds automatically)
- ✅ Frequently filtered columns (`WHERE`, `ORDER BY`)
- ✅ Composite columns used together

**When NOT to add indexes**:
- ❌ Columns rarely queried
- ❌ Small tables (< 1000 rows)

## Performance Targets

| Query Type | Target | Tool |
|------------|--------|------|
| Simple CRUD | < 10ms | Prisma |
| Complex joins | < 100ms | Kysely |
| Aggregations | < 200ms | Kysely |
| Bulk import (10K rows) | < 5s | Raw SQL `COPY` |

**Monitoring**: Enable Prisma query logging in development:
```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

## Common Mistakes

### ❌ Don't Use `findFirst` for Unique Lookups
**Bad**: `prisma.personnel.findFirst({ where: { id: '123' } })`
**Good**: `prisma.personnel.findUnique({ where: { id: '123' } })`

### ❌ Don't Select All Fields in Production
**Bad**: `prisma.personnel.findMany()` (selects all fields)
**Good**: `prisma.personnel.findMany({ select: { id: true, firstName: true } })`

### ❌ Don't Forget Null Checks on Relations
**Bad**: `personnel.rfidCard.cardNumber` (TypeError if null!)
**Good**: `if (personnel.rfidCard) { ... }`

## Connection Pooling

**Connection pool size** (via `DATABASE_URL`):
```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
```

**Recommended**: 10 connections per server instance.

## Full Guide

**See**: `@docs/guides/database-guide.md` for comprehensive patterns, query examples, and optimization techniques.
