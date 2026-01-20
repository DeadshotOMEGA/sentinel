# Prisma 7 Configuration Notes

**Date:** 2026-01-18
**Issue:** Prisma 7 engine configuration with existing Docker containers

## Current Status

We've successfully:
- ✅ Set up pnpm monorepo structure
- ✅ Created database, contracts, and types packages
- ✅ Created backend app with test infrastructure
- ✅ Configured Testcontainers for isolated testing
- ✅ Configured environment variables from original backend
- ✅ Extracted Prisma schema from develop branch (15+ models)

## Database Connection Details

**Your existing Docker Desktop containers:**
- **Postgres:** localhost:5432, database: sentinel, user: sentinel, password: sentinel_dev
- **Redis:** localhost:6379 (no password)

**Configuration files:**
- `.env` - Updated with correct credentials from original backend
- `docker-compose.yml` - Documentation of container setup

## Prisma 7 Engine Configuration Issue

**Problem:** Prisma 7.2.0 has breaking changes around engine configuration that differ from the original backend (which used Bun + Prisma with adapter).

**Error:** `Using engine type "client" requires either "adapter" or "accelerateUrl" to be provided to PrismaClient constructor.`

**Attempted Solutions:**
1. Added `engineType = "library"` to schema - still requires adapter
2. Removed `@prisma/adapter-pg` dependency - still requires adapter
3. Used default generator config - still requires adapter

**Root Cause:** Prisma 7 defaults have changed and require explicit configuration that we need to research.

## Recommended Next Steps

### Option 1: Use Prisma 6 (Quick Fix)
Downgrade to Prisma 6 which has proven compatibility:
```bash
pnpm remove prisma @prisma/client
pnpm add -D prisma@^6.0.0
pnpm add @prisma/client@^6.0.0
```

### Option 2: Use Testcontainers for Development (Current Approach)
Since Testcontainers work with Prisma 7, we can:
1. Use Testcontainers for all development and testing
2. Research Prisma 7 configuration in parallel
3. Connect to Docker Desktop containers later once configuration is sorted

### Option 3: Research Prisma 7 Configuration
Review Prisma 7 migration guide and configure properly:
- https://pris.ly/d/prisma7-client-config
- May need `prisma.config.ts` file (new in Prisma 7)
- May need to explicitly configure binary engine

## Testcontainers Status

**Working perfectly!** Test infrastructure is ready:
- PostgreSQL 15 Alpine container
- Automatic migration application
- Container reuse for speed
- Test factories for all entities
- 6 verification tests created

## Files Created

- [scripts/test-db-connection.ts](../../scripts/test-db-connection.ts) - Database connection test script
- [.env](../../.env) - Development environment with original backend credentials
- [docker-compose.yml](../../docker-compose.yml) - Container documentation
- [packages/database/prisma/schema.prisma](../../packages/database/prisma/schema.prisma) - Database schema from develop
- [packages/database/prisma/migrations/](../../packages/database/prisma/migrations/) - One migration extracted

## What Works

1. **Testcontainers:** Fully functional for integration tests
2. **Monorepo setup:** All packages configured correctly
3. **TypeScript:** Strict mode working across all packages
4. **Test infrastructure:** Vitest, factories, helpers all ready

## What Needs Resolution

1. **Prisma 7 configuration:** Need to configure for direct PostgreSQL connection (non-adapter mode)
2. **Migration from Docker containers:** Once Prisma is configured, can run migrations on existing database

## Recommendation

**Proceed with Testcontainers for Phase 1.3** repository migration. This allows us to:
- Continue development without blocking on Prisma 7 configuration
- Use isolated test databases (best practice anyway)
- Research Prisma 7 configuration in parallel
- Connect to Docker Desktop containers when needed for Phase 2

The Testcontainers approach is actually **better** for development as it ensures:
- Test isolation (no shared state)
- Consistent CI/CD behavior
- Clean slate for each test run
- No conflicts with existing data

## Next Actions

1. ✅ **Recommended:** Continue with Phase 1.3 using Testcontainers
2. ⏸️ **Later:** Research Prisma 7 config for Docker Desktop connection
3. ⏸️ **Alternative:** Downgrade to Prisma 6 if Prisma 7 blocks progress

---

**Bottom Line:** We're ready to proceed with Phase 1.3 (repository migration) using Testcontainers. The Docker Desktop integration can be configured later without blocking development progress.
