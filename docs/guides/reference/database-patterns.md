---
type: reference
title: Database Patterns
status: current
created: 2026-01-23
last_updated: 2026-01-23
---

# Database Patterns Reference

Complete code examples and patterns for working with Prisma 7 in the Sentinel database package.

## Adapter Setup

Configure the PostgreSQL adapter for Prisma 7 in `prisma/prisma.config.ts`:

```typescript
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const adapter = new PrismaPg(pool)
```

## Client Singleton

Create the global singleton export in `src/client.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { adapter } from '../prisma/prisma.config'

export const prisma = new PrismaClient({
  adapter, // ⚠️ Required in Prisma 7
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})
```

## Repository Usage with Dependency Injection

Implement repository pattern with injectable Prisma client:

```typescript
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

export class Repository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findAll() {
    return await this.prisma.entity.findMany()
  }
}
```

## Test Usage with Testcontainers

Inject test container database client in tests:

```typescript
import { PrismaClient } from '@sentinel/database'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: testContainerUrl })
const adapter = new PrismaPg(pool)
const testPrisma = new PrismaClient({ adapter })

const repo = new Repository(testPrisma) // Inject test client
```

## ESM Re-Export Pattern

Export types and client from `src/index.ts` for ESM/CJS interop:

```typescript
export { prisma } from './client'

// Explicit re-export for ESM/CJS interop
import PrismaClientModule from '../generated/client/index.js'
export const { Prisma, PrismaClient } = PrismaClientModule
export type * from '../generated/client'
```

## Common Commands

Essential Prisma CLI commands:

```bash
# Generate Prisma client (run after schema changes)
pnpm prisma generate

# Open database GUI
pnpm prisma studio

# Apply schema to dev database
pnpm prisma db push

# Create migration
pnpm prisma migrate dev --name migration_name

# Apply migrations (production)
pnpm prisma migrate deploy

# Reset database (destructive!)
pnpm prisma migrate reset

# Format schema file
pnpm prisma format

# Validate schema
pnpm prisma validate
```

## Troubleshooting Quick Reference

| Error                                                     | Cause                             | Fix                                         |
| --------------------------------------------------------- | --------------------------------- | ------------------------------------------- |
| "requires either 'adapter' or 'accelerateUrl'"            | Missing adapter parameter         | Add `adapter` to PrismaClient constructor   |
| "Unknown property datasources"                            | Using Prisma 6 pattern            | Remove `datasources`, use `adapter` instead |
| "DATABASE_URL environment variable is required"           | Missing env var                   | Set DATABASE_URL before importing           |
| "Property 'entity' does not exist on type 'PrismaClient'" | Client not regenerated            | Run `pnpm prisma generate`                  |
| Module resolution errors                                  | Package not built                 | Run `pnpm build` in database package        |
| "password authentication failed" in tests                 | Using global prisma in repository | Use `this.prisma`, not `prisma`             |

## Environment Variables

Required and optional variables for database connection:

```bash
# Required
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Optional
LOG_LEVEL="info"  # Controls Prisma query logging
```

## Key Schema Files

Locations of critical database-related files:

- `prisma/schema.prisma` - Database schema definition
- `prisma/prisma.config.ts` - Adapter configuration
- `src/client.ts` - Global singleton export
- `generated/client/` - Generated Prisma client (do not edit)

## Dependencies

Required packages for database functionality:

- `@prisma/client` - Prisma ORM client (runtime)
- `@prisma/adapter-pg` - PostgreSQL adapter for Prisma 7 (required)
- `pg` - Node.js PostgreSQL driver (connection pooling)
- `prisma` - Prisma CLI (dev dependency)

## See Also

- [Prisma 7 Migration Guide](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions)
- Schema definition: `prisma/schema.prisma`
