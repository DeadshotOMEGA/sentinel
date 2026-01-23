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
- MUST use dependency injection in repositories

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

**When importing in other packages**:

- Production/Services: `import { prisma } from '@sentinel/database'` (global singleton)
- Repositories: Use dependency injection with optional constructor parameter
- Tests: Inject Testcontainers client via constructor

**When troubleshooting**:

- Error "requires adapter" → Missing adapter in PrismaClient constructor
- Error "Unknown property datasources" → Using Prisma 6 pattern (remove datasources)
- Error "DATABASE_URL not found" → Set environment variable before import
- Module resolution errors → Run `pnpm prisma generate` and `pnpm build`
- See: `docs/guides/reference/database-patterns.md` for troubleshooting table

## Reference

Complete code examples, common commands, and detailed patterns: `docs/guides/reference/database-patterns.md`
