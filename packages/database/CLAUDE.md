# Database Package

Shared Prisma client for Sentinel monorepo using **Prisma 7** with PostgreSQL adapter.

## ⚠️ Critical: Prisma 7 Adapter Pattern

This project uses **Prisma 7** which has a **breaking change** from Prisma 6: it requires an adapter for database connections.

### Why This Matters

**Prisma 6 Pattern** (doesn't work in v7):
```typescript
// ❌ This will fail in Prisma 7
new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
})
```

**Prisma 7 Pattern** (required):
```typescript
// ✅ Required in Prisma 7
new PrismaClient({
  adapter,  // Must provide adapter or accelerateUrl
  log: [...]
})
```

## Configuration

### Adapter Setup (`prisma/prisma.config.ts`)
```typescript
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

const pool = new Pool({ connectionString })
export const adapter = new PrismaPg(pool)
```

**Key Points**:
- Uses `pg` (node-postgres) Pool for connection management
- Wrapped with `@prisma/adapter-pg` for Prisma 7 compatibility
- Pool is reused across all Prisma operations (connection pooling)

### Client Singleton (`src/client.ts`)
```typescript
import { PrismaClient } from '@prisma/client'
import { adapter } from '../prisma/prisma.config'

export const prisma = new PrismaClient({
  adapter,  // ⚠️ Required in Prisma 7
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})
```

**Global Singleton Pattern**:
- Exports single `prisma` instance for app-wide use
- Cached in `globalThis` to prevent multiple instances in dev (hot reload)
- Used directly in services, routes, and utilities
- **Not used in repositories** - they use dependency injection for testability

## Common Errors and Fixes

### Error: "requires either 'adapter' or 'accelerateUrl'"
```
PrismaClientConstructorValidationError: Using engine type "client"
requires either "adapter" or "accelerateUrl" to be provided to
PrismaClient constructor.
```

**Cause**: Creating PrismaClient without adapter in Prisma 7.

**Fix**: Always pass `adapter` option:
```typescript
// ❌ Wrong
new PrismaClient({ log: [...] })

// ✅ Correct
import { adapter } from '../prisma/prisma.config'
new PrismaClient({ adapter, log: [...] })
```

### Error: "Unknown property datasources"
```
PrismaClientConstructorValidationError: Unknown property datasources
provided to PrismaClient constructor.
```

**Cause**: Using Prisma 6 pattern with Prisma 7 client.

**Fix**: Remove `datasources` config and use adapter instead:
```typescript
// ❌ Prisma 6 pattern (doesn't work in v7)
new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
})

// ✅ Prisma 7 pattern
new PrismaClient({ adapter })
```

### Error: "DATABASE_URL environment variable is required"
**Cause**: `DATABASE_URL` not set in environment.

**Fix**: Ensure environment variable is set before Prisma import:
```bash
# Development
DATABASE_URL="postgresql://user:pass@localhost:5432/sentinel"

# Tests (automatically set by testcontainers)
# See apps/backend/tests/setup.ts for placeholder value
```

## Usage Patterns

### In Repositories (Dependency Injection)
Repositories accept PrismaClient for testability:

```typescript
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

export class UserRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  // ✅ Always use this.prisma (never import global prisma in methods)
  async findById(id: string) {
    return await this.prisma.user.findUnique({ where: { id } })
  }
}
```

**Why DI?** Tests inject testcontainers database instead of production DB.

### In Services/Routes (Direct Usage)
Services and routes use global singleton directly:

```typescript
import { prisma } from '@sentinel/database'

export class UserService {
  async getUser(id: string) {
    return await prisma.user.findUnique({ where: { id } })
  }
}
```

### In Tests (Testcontainers)
Tests create isolated Prisma instances:

```typescript
import { PrismaClient } from '@sentinel/database'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Create test-specific instance
const pool = new Pool({ connectionString: testContainerUrl })
const adapter = new PrismaPg(pool)
const testPrisma = new PrismaClient({ adapter })

// Inject into repositories
const repo = new UserRepository(testPrisma)
```

See `apps/backend/tests/helpers/testcontainers.ts` for full implementation.

## Environment Variables

### Required

**DATABASE_URL**: PostgreSQL connection string
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Example values**:
```bash
# Development
DATABASE_URL="postgresql://sentinel:dev_password@localhost:5432/sentinel"

# Production
DATABASE_URL="postgresql://sentinel:prod_password@db.example.com:5432/sentinel"

# Test (set by testcontainers automatically)
DATABASE_URL="postgresql://testuser:testpass@localhost:32768/sentineltest"
```

### Optional

**LOG_LEVEL**: Controls Prisma query logging (default: based on NODE_ENV)
- `development`: Logs queries, errors, warnings
- `production`: Logs errors only

## Schema Management

### Development Workflow
```bash
cd packages/database

# 1. Modify schema
vim prisma/schema.prisma

# 2. Generate Prisma client (TypeScript types)
pnpm prisma generate

# 3. Apply to dev database
pnpm prisma db push

# 4. Create migration (for production)
pnpm prisma migrate dev --name description_of_change
```

### Production Deployment
```bash
# Apply migrations
pnpm prisma migrate deploy

# Generate client (if not in build step)
pnpm prisma generate
```

### Common Commands
```bash
# Generate TypeScript client from schema
pnpm prisma generate

# Open Prisma Studio (database GUI)
pnpm prisma studio

# Validate schema syntax
pnpm prisma validate

# Format schema file
pnpm prisma format

# Create migration
pnpm prisma migrate dev --name migration_name

# Apply migrations (prod)
pnpm prisma migrate deploy

# Reset database (dev only - destructive!)
pnpm prisma migrate reset
```

## Schema Structure

Located at: `prisma/schema.prisma`

### Core Models

- **Member** - Personnel with badges, checkins, tags
- **Badge** - RFID badges assigned to members/visitors
- **Checkin** - Badge scan events (IN/OUT)
- **Division** - Organizational units (OPS, LOG, ADMIN)
- **Tag** - Member categorization (VIP, BMQ, etc.)
- **Visitor** - Temporary access for non-members
- **Event** - Temporary activities with attendance

### Enum Tables (Configurable Lookup Tables)

These tables provide configurable enumeration values instead of hardcoded enums:

- **MemberStatus** - Member status types (Active, Inactive, On Leave, etc.)
- **MemberType** - Member types (Regular, Reserve, Civilian, etc.)
- **VisitType** - Visitor types (Guest, Contractor, Delivery, etc.)
- **BadgeStatus** - Badge status types (Active, Lost, Damaged, etc.)
- **ListItem** - Generic configurable lists (ranks, roles, messes, MOCs, etc.)

**Enum Table Pattern**:
```prisma
model MemberStatus {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code        String    @unique @db.VarChar(50)
  name        String    @db.VarChar(100)
  description String?
  color       String?   @db.VarChar(50)
  createdAt   DateTime? @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt   DateTime? @default(now()) @map("updated_at") @db.Timestamp(6)
  members     Member[]  // Reverse relation

  @@index([code], map: "idx_member_statuses_code")
  @@index([name], map: "idx_member_statuses_name")
  @@map("member_statuses")
}
```

**Key characteristics**:
- UUID primary key with `dbgenerated("gen_random_uuid()")`
- Unique `code` field for programmatic access
- Human-readable `name` field
- Optional `description` and `color` for UI
- Timestamps for auditing
- Indexes on `code` and `name` for performance
- Reverse relation array for querying usage

### Foreign Key Pattern

Parent tables maintain both string and FK columns during transition:

```prisma
model Member {
  // Legacy string columns (kept for backward compatibility)
  memberType      String    @map("member_type") @db.VarChar(20)
  status          String    @default("active") @db.VarChar(20)

  // New FK columns (nullable during transition)
  memberTypeId    String?   @map("member_type_id") @db.Uuid
  memberStatusId  String?   @map("member_status_id") @db.Uuid

  // Relations
  memberTypeRef   MemberType?   @relation(fields: [memberTypeId], references: [id])
  memberStatusRef MemberStatus? @relation(fields: [memberStatusId], references: [id])

  // Indexes for FK columns
  @@index([memberTypeId], map: "idx_members_member_type_id")
  @@index([memberStatusId], map: "idx_members_member_status_id")
}
```

**Migration strategy**:
1. Add enum tables
2. Add nullable FK columns to parent tables
3. Populate enum tables with existing values
4. Migrate data (update FK columns to reference enum records)
5. Eventually: Make FK columns required, drop string columns

**Important**: Both sides of relation must be defined:
- Parent: FK field + relation field
- Child: Reverse relation array (e.g., `members Member[]`)

See schema file for full model definitions and relations.

## Dependencies

**Runtime**:
- `@prisma/client` - Prisma ORM client
- `@prisma/adapter-pg` - PostgreSQL adapter for Prisma 7
- `pg` - Node.js PostgreSQL driver (connection pooling)

**Development**:
- `prisma` - Prisma CLI (schema management, migrations)

## Testing Considerations

### Global Singleton Conflicts
The global `prisma` singleton exports from this package connect to the DATABASE_URL environment variable. Tests must:

1. **Set placeholder before import** (see `apps/backend/tests/setup.ts`):
   ```typescript
   process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
   ```

2. **Inject test instance** into repositories:
   ```typescript
   const repo = new Repository(testDb.prisma!)  // Not global prisma
   ```

3. **Never use global prisma** in repository methods (use `this.prisma`)

### Why This Pattern?

- **Production**: One global connection pool (efficient)
- **Tests**: Isolated containers per test file (no conflicts)
- **Repositories**: Can use either global or injected client (flexible)

## Migration from Prisma 6

If migrating from Prisma 6:

1. **Update imports**:
   ```typescript
   // Old
   import { prisma } from './prisma'

   // New
   import { prisma } from '@sentinel/database'
   ```

2. **Remove datasources config**:
   ```typescript
   // Old - remove this
   new PrismaClient({
     datasources: { db: { url: process.env.DATABASE_URL } }
   })

   // New - use adapter
   new PrismaClient({ adapter })
   ```

3. **Update PrismaClient initialization** to require adapter (see patterns above)

4. **Regenerate client**:
   ```bash
   pnpm prisma generate
   ```

## Troubleshooting

### Module Resolution Issues
If TypeScript can't find `@sentinel/database`:

1. Check `tsconfig.json` has path mapping:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@sentinel/database": ["../../packages/database/src"]
       }
     }
   }
   ```

2. Ensure package exports in `package.json`:
   ```json
   {
     "exports": {
       ".": "./src/index.ts",
       "./prisma": "./prisma/schema.prisma"
     }
   }
   ```

3. Run `pnpm install` at workspace root

### Connection Pool Exhaustion
If seeing "too many connections" errors:

1. Check connection pool size in `prisma.config.ts`
2. Ensure connections are properly closed (`$disconnect()`)
3. Verify no connection leaks in services/routes

### Schema Changes Not Reflected
After modifying `schema.prisma`:

1. Must run `pnpm prisma generate` to update TypeScript types
2. Test files will auto-apply via `db push` in testcontainers
3. Dev database needs manual `db push` or migration

## Performance Tips

1. **Use connection pooling** - Already configured via `pg` Pool
2. **Use transactions** for multi-operation logic
3. **Use includes** instead of separate queries (N+1)
4. **Use select** to limit returned fields
5. **Use indexes** in schema for frequently queried fields

## Common Issues and Solutions

### Issue: FK Queries Fail with "column does not exist"

**Symptom**:
```
Raw query failed. Code: `42703`. Message: `column "member_status_id" does not exist`
```

**Cause**: Repository code queries FK column that hasn't been added to parent table yet.

**Solution**:
1. Add FK column to parent table in schema:
   ```prisma
   model Member {
     memberStatusId String? @map("member_status_id") @db.Uuid
     // ...
   }
   ```
2. Add relation fields to both sides:
   ```prisma
   model Member {
     memberStatusRef MemberStatus? @relation(fields: [memberStatusId], references: [id])
   }

   model MemberStatus {
     members Member[] // Reverse relation required!
   }
   ```
3. Regenerate Prisma client: `pnpm prisma generate`
4. Apply schema: `pnpm prisma db push` (dev) or create migration (prod)

### Issue: Prisma Relation Error "field must specify relation"

**Symptom**:
```
Error validating: The relation field `memberStatusRef` on Model `Member` must specify the `references` argument
```

**Cause**: Missing reverse relation on child table.

**Solution**: Add array field to child model:
```prisma
model MemberStatus {
  members Member[] // This line is required!
}
```

Prisma requires bidirectional relations even if you only query one direction.

### Issue: Test Fails with "Unknown argument divisionId"

**Symptom**:
```
Unknown argument `divisionId`. Did you mean `division`?
```

**Cause**: Test code uses raw field name instead of Prisma's generated nested create syntax.

**Solution**: When creating records with FK in tests:
```typescript
// ❌ Wrong - uses FK column directly
await prisma.member.create({
  data: {
    divisionId: 'uuid-here', // Error!
    // ...
  }
})

// ✅ Correct - uses relation syntax
await prisma.member.create({
  data: {
    division: {
      connect: { id: 'uuid-here' }
    },
    // ...
  }
})

// ✅ Or use raw SQL (what repositories use)
await prisma.$queryRaw`
  INSERT INTO members (division_id, ...) VALUES (${divisionId}, ...)
`
```

### Issue: Schema Changes Not Reflecting in Tests

**Symptom**: Tests fail with "relation does not exist" after adding enum tables.

**Solution**:
1. Ensure Prisma client regenerated: `pnpm prisma generate`
2. Tests auto-apply schema via testcontainers `db push`
3. If still failing, clean Docker containers: `docker ps -aq | xargs -r docker rm -f`
4. Re-run tests to trigger fresh schema application

### Issue: Deadlock Detected During Tests

**Symptom**:
```
Raw query failed. Code: `40P01`. Message: `deadlock detected`
```

**Cause**: Testcontainers timing issues with parallel operations or container lifecycle.

**Workaround**:
- Run tests individually or in smaller batches
- Add delays between tests if needed
- Infrastructure issue, not code issue (tests pass individually)

## References

- [Prisma 7 Migration Guide](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions)
- [Prisma Adapter Documentation](https://www.prisma.io/docs/orm/overview/databases/database-drivers)
- [PostgreSQL Adapter (@prisma/adapter-pg)](https://www.prisma.io/docs/orm/overview/databases/postgresql#drivers)
- [Prisma Relations Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations)
