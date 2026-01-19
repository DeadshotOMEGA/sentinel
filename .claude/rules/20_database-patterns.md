# Database Patterns

Apply to: All database operations in Sentinel backend

## Rule

Use Prisma for schema management, Kysely for performance-critical queries, and raw SQL with `COPY` for bulk imports.

## When This Applies

- Defining or modifying database schema
- Writing database queries
- Importing data from CSV files
- Optimizing slow queries

## Hybrid ORM Approach

### Prisma → Schema Management

**Use for**:
- Schema definition (`schema.prisma`)
- Migrations (`prisma migrate`)
- Type generation (`prisma generate`)
- Simple CRUD operations
- Relationships and includes

**Why**: Best developer experience for schema evolution across 15+ models.

### Kysely → Performance-Critical Queries

**Use for**:
- Complex joins with aggregations
- Reporting queries
- Performance-critical read paths (< 100ms requirement)
- Dynamic query building

**Why**: 2x faster than Prisma for complex queries (50ms vs 110ms in benchmarks).

### Raw SQL → Bulk Operations

**Use for**:
- CSV imports (use PostgreSQL `COPY`)
- Batch inserts (> 1000 rows)
- Complex migrations

**Why**: 3x faster than any ORM for bulk operations.

## Decision Tree

```
Need to → Use

Create table/model       → Prisma schema
Run migration            → Prisma Migrate
Simple CRUD             → Prisma Client
Complex join/aggregate  → Kysely
Bulk import from CSV    → Raw SQL (COPY)
```

## Prisma Patterns

### 1. Schema Best Practices

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["relationLoadStrategy"]
}

model Personnel {
  id          String   @id @default(uuid())  // UUIDs, not auto-increment
  firstName   String
  lastName    String
  rank        String
  division    Division?
  email       String?   @unique
  rfidCard    RFIDCard?
  records     AttendanceRecord[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt           // Auto-update timestamp

  @@index([lastName, firstName])            // Composite index for search
  @@index([rank])
}

model AttendanceRecord {
  id          String   @id @default(uuid())
  personnelId String
  personnel   Personnel @relation(fields: [personnelId], references: [id], onDelete: Cascade)
  timestamp   DateTime
  eventType   EventType

  @@index([personnelId, timestamp(sort: Desc)])  // Optimized for recent lookups
}

enum EventType {
  CHECK_IN
  CHECK_OUT
}
```

### 2. Enable Query Optimization

Always use `relationLoadStrategy: 'join'` for relations:

```typescript
const personnel = await prisma.personnel.findMany({
  relationLoadStrategy: 'join', // vs default 'query' (N+1)
  include: {
    rfidCard: true,
    records: {
      take: 10,
      orderBy: { timestamp: 'desc' },
    },
  },
})
```

**Performance Impact**: 2-3x faster for queries with relations.

### 3. Proper Error Handling

```typescript
import { Prisma } from '@prisma/client'

try {
  await prisma.personnel.create({ data: { ... } })
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new Error('RFID card already assigned')
    }
    if (error.code === 'P2025') {
      // Record not found
      throw new Error('Personnel not found')
    }
  }
  throw error
}
```

**Common Error Codes**:
- `P2002`: Unique constraint violation
- `P2003`: Foreign key constraint violation
- `P2025`: Record not found

## Kysely Patterns

### 1. When to Use Kysely

✅ Complex reporting queries
✅ Dynamic WHERE clauses
✅ Performance-critical reads (< 100ms)
✅ Aggregations with multiple joins

❌ Simple CRUD (use Prisma)
❌ One-off operations

### 2. Query Example

```typescript
import { db } from '@/lib/kysely' // Kysely instance
import { sql } from 'kysely'

const attendanceReport = await db
  .selectFrom('attendance_records as ar')
  .innerJoin('personnel as p', 'p.id', 'ar.personnel_id')
  .leftJoin('excuses as e', (join) =>
    join
      .onRef('e.personnel_id', '=', 'p.id')
      .on('e.date', '=', sql`DATE(ar.timestamp)`)
  )
  .select([
    'p.id',
    'p.first_name',
    'p.last_name',
    sql<number>`COUNT(ar.id)`.as('total_events'),
    sql<number>`COUNT(DISTINCT DATE(ar.timestamp))`.as('days_present'),
    sql<number>`COUNT(e.id)`.as('excused_days'),
  ])
  .where('ar.timestamp', '>=', startDate)
  .where('ar.timestamp', '<=', endDate)
  .groupBy('p.id')
  .orderBy('total_events', 'desc')
  .execute()
```

**Why Kysely Here**: Complex aggregations + dynamic date filtering → 2x faster than Prisma.

### 3. Type Generation

Generate Kysely types from Prisma schema:

```bash
pnpm prisma generate
pnpm kysely-codegen --out-file src/db/kysely-types.ts
```

## Bulk Import Pattern

### CSV → PostgreSQL with `COPY`

```typescript
import { copyFrom } from 'pg-copy-streams'
import { pipeline } from 'stream/promises'
import fs from 'fs'

async function bulkImportAttendance(csvPath: string) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Create temp table
    await client.query(`
      CREATE TEMP TABLE attendance_temp (
        personnel_id UUID,
        timestamp TIMESTAMPTZ,
        event_type TEXT
      )
    `)

    // COPY from CSV
    const stream = client.query(
      copyFrom(`
        COPY attendance_temp (personnel_id, timestamp, event_type)
        FROM STDIN
        WITH (FORMAT csv, HEADER true, DELIMITER ',')
      `)
    )

    const fileStream = fs.createReadStream(csvPath)
    await pipeline(fileStream, stream)

    // Validate and insert into main table
    await client.query(`
      INSERT INTO attendance_records (id, personnel_id, timestamp, event_type, created_at)
      SELECT gen_random_uuid(), personnel_id, timestamp, event_type, NOW()
      FROM attendance_temp
      WHERE personnel_id IN (SELECT id FROM personnel)  -- Validate FK
    `)

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

**Performance**: 3x faster than `prisma.attendanceRecord.createMany()`.

## Migration Workflow

### Development

```bash
# Create migration (auto-generates SQL)
pnpm prisma migrate dev --name add_excuses_table

# Reset database (destructive)
pnpm prisma migrate reset
```

### Production

```bash
# Apply pending migrations
pnpm prisma migrate deploy

# Regenerate Prisma Client
pnpm prisma generate
```

### Migration Best Practices

1. **Always backup** before production migrations
2. **Test on staging** first
3. **Never edit** applied migrations
4. **Use raw SQL** for data migrations (separate from schema migrations)

## Indexing Strategy

### When to Add Indexes

✅ Foreign keys (Prisma adds automatically)
✅ Frequently filtered columns (`WHERE`, `ORDER BY`)
✅ Composite columns used together

❌ Columns rarely queried
❌ Small tables (< 1000 rows)

### Index Examples

```prisma
model Personnel {
  // Single-column index for exact lookups
  email String? @unique

  // Composite index for search
  @@index([lastName, firstName])

  // Index for filtering
  @@index([rank])
  @@index([division])
}

model AttendanceRecord {
  // Index for recent records query
  @@index([personnelId, timestamp(sort: Desc)])

  // Index for date range queries
  @@index([timestamp(sort: Desc)])
}
```

## Common Mistakes

### ❌ Don't Use `findFirst` for Unique Lookups

**Bad**:
```typescript
const personnel = await prisma.personnel.findFirst({
  where: { id: '123' },
})
```

**Good**:
```typescript
const personnel = await prisma.personnel.findUnique({
  where: { id: '123' },
})
```

**Why**: `findUnique` is faster and type-safe for unique fields.

### ❌ Don't Use `select *` in Production

**Bad**:
```typescript
const personnel = await prisma.personnel.findMany() // Selects all fields
```

**Good**:
```typescript
const personnel = await prisma.personnel.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    rank: true,
  },
})
```

**Why**: Reduces data transfer and improves performance.

### ❌ Don't Forget to Handle Null Relations

**Bad**:
```typescript
const personnel = await prisma.personnel.findUnique({
  where: { id: '123' },
  include: { rfidCard: true },
})

console.log(personnel.rfidCard.cardNumber) // TypeError if null!
```

**Good**:
```typescript
if (personnel.rfidCard) {
  console.log(personnel.rfidCard.cardNumber)
}
```

## Query Performance Guidelines

| Query Type | Target | Tool |
|------------|--------|------|
| Simple CRUD | < 10ms | Prisma |
| Complex joins | < 100ms | Kysely |
| Bulk imports | < 5s for 10k rows | Raw SQL (COPY) |
| Aggregations | < 200ms | Kysely |

**Monitoring**: Use Prisma query logging in development:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

## Connection Pooling

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})

export { prisma }
```

**Connection Pool Size** (via DATABASE_URL):
```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
```

**Recommended**: 10 connections per server instance.

## Related

- [docs/03-orm-database-comparison.md](../../docs/03-orm-database-comparison.md) - ORM benchmarks
- [.claude/agents/database-specialist.md](../.claude/agents/database-specialist.md) - Database agent
