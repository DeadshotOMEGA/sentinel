# CLAUDE Rules: Database Package

## Scope
Applies when editing files under: `packages/database/`

## Non-Negotiables (MUST / MUST NOT)

**Prisma 7 Configuration**:
- MUST use Prisma 7 with `@prisma/adapter-pg`
- MUST provide `adapter` to PrismaClient constructor
- MUST NOT use `datasources` config (Prisma 6 pattern - removed in v7)
- MUST set DATABASE_URL environment variable before importing client

**Client Usage**:
- MUST use singleton pattern for production (`src/client.ts` export)
- MUST inject PrismaClient in tests (NOT global singleton)
- MUST use dependency injection in repositories (see Repository CLAUDE.md)

**Schema Management**:
- MUST run `pnpm prisma generate` after schema changes
- MUST use migrations for production (`prisma migrate deploy`)
- MUST use `db push` for development

**ESM Compatibility**:
- MUST configure package as ESM module (`"type": "module"` in package.json)
- MUST generate client to custom location (`output = "../generated/client"`)
- MUST use explicit re-export pattern for Prisma types

## Defaults (SHOULD)

**Development**:
- SHOULD use `prisma studio` for database GUI
- SHOULD enable query logging in development
- SHOULD format schema with `prisma format`

**Production**:
- SHOULD use connection pooling via `pg` Pool
- SHOULD log errors only (not queries) in production
- SHOULD validate environment variables at startup

**Testing**:
- SHOULD use Testcontainers for integration tests
- SHOULD apply schema via `db push` in tests (NOT migrations)
- SHOULD reset database between tests

## Workflow

**When modifying schema**:
1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma generate` (updates TypeScript types)
3. Run `pnpm prisma db push` (applies to dev database)
4. Create migration: `pnpm prisma migrate dev --name description`
5. Rebuild package: `pnpm build`

**When troubleshooting**:
- Error "requires adapter" → Missing adapter in PrismaClient constructor
- Error "Unknown property datasources" → Using Prisma 6 pattern (remove datasources)
- Error "DATABASE_URL not found" → Set environment variable before import
- Module resolution errors → Run `pnpm prisma generate` and `pnpm build`
- See: [Troubleshooting Section](#troubleshooting-quick-reference) below

**When importing in other packages**:
- Production/Services: `import { prisma } from '@sentinel/database'` (global singleton)
- Repositories: Use dependency injection with optional constructor parameter
- Tests: Inject Testcontainers client via constructor

## Quick Reference

**Adapter Setup** (`prisma/prisma.config.ts`):
```typescript
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const adapter = new PrismaPg(pool)
```

**Client Singleton** (`src/client.ts`):
```typescript
import { PrismaClient } from '@prisma/client'
import { adapter } from '../prisma/prisma.config'

export const prisma = new PrismaClient({
  adapter,  // ⚠️ Required in Prisma 7
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
})
```

**Repository Usage** (with dependency injection):
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

**Test Usage** (with Testcontainers):
```typescript
import { PrismaClient } from '@sentinel/database'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: testContainerUrl })
const adapter = new PrismaPg(pool)
const testPrisma = new PrismaClient({ adapter })

const repo = new Repository(testPrisma)  // Inject test client
```

**Common Commands**:
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

| Error | Cause | Fix |
|-------|-------|-----|
| "requires either 'adapter' or 'accelerateUrl'" | Missing adapter parameter | Add `adapter` to PrismaClient constructor |
| "Unknown property datasources" | Using Prisma 6 pattern | Remove `datasources`, use `adapter` instead |
| "DATABASE_URL environment variable is required" | Missing env var | Set DATABASE_URL before importing |
| "Property 'entity' does not exist on type 'PrismaClient'" | Client not regenerated | Run `pnpm prisma generate` |
| Module resolution errors | Package not built | Run `pnpm build` in database package |
| "password authentication failed" in tests | Using global prisma in repository | Use `this.prisma`, not `prisma` |

**See Also**:
- [Repository Pattern](../../apps/backend/src/repositories/CLAUDE.md) - Dependency injection for testability
- [Query Patterns](src/CLAUDE.md) - Prisma vs Kysely decision tree, performance
- [Schema Reference](prisma/schema.prisma) - Complete database schema
- [Prisma 7 Migration Guide](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions)

**Environment Variables**:
```bash
# Required
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Optional
LOG_LEVEL="info"  # Controls Prisma query logging
```

**Key Schema Files**:
- `prisma/schema.prisma` - Database schema definition
- `prisma/prisma.config.ts` - Adapter configuration
- `src/client.ts` - Global singleton export
- `generated/client/` - Generated Prisma client (do not edit)

**ESM Re-Export Pattern** (`src/index.ts`):
```typescript
export { prisma } from './client'

// Explicit re-export for ESM/CJS interop
import PrismaClientModule from '../generated/client/index.js'
export const { Prisma, PrismaClient } = PrismaClientModule
export type * from '../generated/client'
```

**Dependencies**:
- `@prisma/client` - Prisma ORM client (runtime)
- `@prisma/adapter-pg` - PostgreSQL adapter for Prisma 7 (required)
- `pg` - Node.js PostgreSQL driver (connection pooling)
- `prisma` - Prisma CLI (dev dependency)
