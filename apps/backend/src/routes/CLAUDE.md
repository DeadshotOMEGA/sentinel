# CLAUDE Rules: Routes

## Scope

Applies when creating or modifying: `apps/backend/src/routes/*.ts`

## Non-Negotiables (MUST / MUST NOT)

**ts-rest Pattern**:

- MUST use direct async functions (NOT middleware arrays or handler objects)

**Route Ordering**:

- MUST define specific paths BEFORE parameterized paths in both contract and router
- MUST match contract order in router implementation
- Express matches routes in definition order. Parameterized routes like `/:id` will match specific paths like `/stats` if defined first

**Database Access**:

- MUST use `getPrismaClient()` from `../lib/database.js` for all database queries
- MUST NOT import `prisma` from `@sentinel/database` in routes
- MUST use repositories when possible (NOT direct Prisma queries)
- MUST NOT use global prisma singleton
- Routes must support test injection. The global prisma singleton can't be replaced during tests, causing authentication errors

**Response Structure**:

- MUST return `{ status: <number> as const, body: <response> }` from all handlers
- MUST include `as const` on status codes for type inference
- MUST NOT return status without `as const`

**Type Mapping**:

- MUST convert repository types to API response types (use mapping functions)
- MUST convert Date objects to ISO strings
- MUST use null for optional fields (NOT undefined)
- MUST NOT return repository types directly

**Error Handling**:

- MUST wrap repository calls in try/catch
- MUST handle: 404 (not found), 409 (duplicate/constraint), 500 (unexpected)
- MUST return appropriate status codes based on error type

**Status Codes**:

- MUST use 200 for successful GET/PATCH/DELETE
- MUST use 201 for successful POST
- MUST use 400 for validation failures
- MUST use 404 for missing resources
- MUST use 409 for duplicate/constraint violations
- MUST use 500 for unexpected errors

## Defaults (SHOULD)

**Repository Integration**:

- SHOULD inject PrismaClient via repository constructor
- SHOULD use dependency injection pattern for testability

**Type Conversion**:

- SHOULD create `toApiFormat()` functions for each resource
- SHOULD handle optional fields with null fallbacks

**Pagination**:

- SHOULD use standard pagination params: page, limit
- SHOULD return total, page, limit, totalPages in response

## Workflow

**When implementing new route**:

1. Create Valibot schema in `@sentinel/contracts/src/schemas/`
2. Create ts-rest contract in `@sentinel/contracts/src/contracts/`
3. Export from `@sentinel/contracts/src/index.ts`
4. Implement route with direct async function
5. Mount route in app.ts using `createExpressEndpoints()`
6. Write integration tests with Supertest

**When handling errors**:

1. Wrap repository call in try/catch
2. Check for null (return 404)
3. Check for Prisma unique constraint (return 409)
4. Return 500 for unexpected errors

**Authentication**: Applied globally via middleware in app.ts, NOT in individual route handlers.

**Validation**: Handled by Valibot schemas in `@sentinel/contracts`, NOT in routes.

## Code Examples

See [route-patterns.md](../../../docs/guides/reference/route-patterns.md) for implementation patterns and complete examples.
