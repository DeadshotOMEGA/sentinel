---
type: reference
title: Database Query Patterns
status: current
created: 2026-01-23
last_updated: 2026-01-23
---

# Database Query Patterns

Complete patterns and examples for Prisma, Kysely, and bulk operations.

## Tool Decision Tree

| Task                             | Use            | Target Performance |
| -------------------------------- | -------------- | ------------------ |
| Create table/model               | Prisma schema  | N/A                |
| Run migration                    | Prisma Migrate | N/A                |
| Simple CRUD                      | Prisma Client  | < 10ms             |
| Complex query (joins/aggregates) | Kysely         | < 100ms            |
| Bulk import (CSV)                | Raw SQL `COPY` | < 5s for 10K rows  |

## Prisma Best Practices

✅ Good - Use findUnique for unique lookups:

```typescript
await prisma.member.findUnique({ where: { id: '123' } })
```

❌ Bad - Don't use findFirst for unique lookups:

```typescript
await prisma.member.findFirst({ where: { id: '123' } })
```

✅ Good - Select specific fields:

```typescript
await prisma.member.findMany({
  select: { id: true, firstName: true, lastName: true },
})
```

❌ Bad - Don't select all fields in production:

```typescript
await prisma.member.findMany()
```

✅ Good - Check for null on relations:

```typescript
if (member.division) {
  console.log(member.division.name)
}
```

❌ Bad - Don't access relations without null check:

```typescript
console.log(member.division.name) // TypeError if null!
```

## Kysely for Complex Queries

Import and use for reporting and complex joins:

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

## Bulk Import Pattern

For CSV imports > 1000 rows:

```typescript
// Copy data into temporary table
const stream = client.query(
  copyFrom(`
  COPY attendance_temp (member_id, timestamp, event_type)
  FROM STDIN WITH (FORMAT csv, HEADER true)
`)
)
await pipeline(fileStream, stream)

// Validate + insert with FK check
await client.query(`
  INSERT INTO attendance_records (id, member_id, timestamp, event_type, created_at)
  SELECT gen_random_uuid(), member_id, timestamp, event_type, NOW()
  FROM attendance_temp
  WHERE member_id IN (SELECT id FROM members)
`)
```

## Connection Pooling

Configure via environment variable:

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
```

Recommended: 10 connections per server instance

## Query Logging (Development)

Enable in development for performance monitoring:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

## Performance Targets

- Simple CRUD: < 10ms
- Complex joins: < 100ms
- Aggregations: < 200ms
- Bulk import (10K rows): < 5s
