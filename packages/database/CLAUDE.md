# CLAUDE Rules: Database Package

## Scope

Applies when editing files under: `packages/database/`

## Non-Negotiables (MUST / MUST NOT)

- MUST use Prisma 7 with `@prisma/adapter-pg`
- MUST provide `adapter` to PrismaClient constructor
- MUST NOT use `datasources` config (Prisma 6 pattern removed in v7)
- MUST use singleton pattern for production (`src/client.ts`)
- MUST inject PrismaClient in tests (NOT global singleton)
- MUST run `pnpm prisma generate` after schema changes
- MUST configure package as ESM module (`"type": "module"`)
- MUST generate client to custom location (`output = "../generated/client"`)
- MUST set DATABASE_URL environment variable before importing client

## Defaults (SHOULD)

- SHOULD use `db push` for development, `migrate deploy` for production
- SHOULD use Testcontainers for integration tests
- SHOULD reset database between tests
- SHOULD enable query logging in development only

## Workflow

**When modifying schema**:

1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma generate` and `pnpm prisma db push`
3. Create migration: `pnpm prisma migrate dev --name description`
4. Rebuild: `pnpm build`

**When importing**:

- Production: `import { prisma } from '@sentinel/database'` (singleton)
- Tests: Inject Testcontainers client via constructor

**Common errors**:

- "requires adapter" → Add adapter to PrismaClient constructor
- "DATABASE_URL not found" → Set environment variable before import
- Module errors → Run `pnpm prisma generate && pnpm build`
