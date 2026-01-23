# CLAUDE Rules: Routes

## Scope

Applies when creating or modifying: `apps/backend/src/routes/*.ts`

## Non-Negotiables (MUST / MUST NOT)

- MUST use direct async functions (NOT middleware arrays)
- MUST define specific paths BEFORE parameterized paths (Express matches in order)
- MUST use `getPrismaClient()` from `../lib/database.js` for database queries
- MUST NOT import global `prisma` from `@sentinel/database` (breaks test injection)
- MUST use repositories when possible (NOT direct Prisma queries)
- MUST return `{ status: <number> as const, body: <response> }` with `as const` on status
- MUST convert repository types to API response types, Date to ISO string, optional fields to null
- MUST NOT return repository types directly
- MUST wrap repository calls in try/catch
- MUST use status codes: 200 (GET/PATCH/DELETE), 201 (POST), 400 (validation), 404 (not found), 409 (duplicate), 500 (error)

## Defaults (SHOULD)

- SHOULD inject PrismaClient via repository constructor
- SHOULD create `toApiFormat()` functions for type conversion
- SHOULD use standard pagination: page, limit, total, totalPages in response

## Workflow

**When implementing new route**: Create Valibot schema → Create ts-rest contract → Implement route with async function → Mount in app.ts → Write integration tests

**When handling errors**: Wrap in try/catch → Check for null (404) → Check for constraint (409) → Return 500 for unexpected

**Authentication & Validation**: Applied globally via middleware, NOT in individual handlers
