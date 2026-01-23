# CLAUDE Rules: Routes

ts-rest route implementation patterns with Express.

---

## Scope

Applies when creating or modifying: `apps/backend/src/routes/*.ts`

## Non-Negotiables (MUST / MUST NOT)

**ts-rest Pattern** (CRITICAL):

- MUST use direct async functions (NOT middleware arrays or handler objects):

  ```typescript
  // ✅ Correct
  export const router = s.router(contract, {
    getMembers: async ({ query }) => {
      return { status: 200 as const, body: { ... } }
    },
  })

  // ❌ Wrong - middleware array
  getMembers: {
    middleware: [requireAuth()],
    handler: async ({ query }) => { ... }
  }

  // ❌ Wrong - handler wrapper
  getMembers: {
    handler: async ({ query }) => { ... }
  }
  ```

**Route Ordering** (CRITICAL):

- MUST define specific paths BEFORE parameterized paths in both contract and router
- MUST match contract order in router implementation

  ```typescript
  // ✅ Correct order in contract
  export const contract = c.router({
    getStats: { path: '/api/badges/stats' },        // Specific first
    getBySerial: { path: '/api/badges/serial/:id' }, // Specific first
    getById: { path: '/api/badges/:id' },            // Parameterized last
  })

  // ✅ Correct order in router (matches contract)
  export const router = s.router(contract, {
    getStats: async () => { ... },
    getBySerial: async ({ params }) => { ... },
    getById: async ({ params }) => { ... },
  })

  // ❌ Wrong - :id will match 'stats' and 'serial'
  export const contract = c.router({
    getById: { path: '/api/badges/:id' },            // Parameterized first
    getStats: { path: '/api/badges/stats' },         // Won't be reached
  })
  ```

**Why**: Express matches routes in definition order. Parameterized routes like `/:id` will match specific paths like `/stats` if defined first.

**Database Access** (CRITICAL):

- MUST use `getPrismaClient()` from `../lib/database.js` for all database queries
- MUST NOT import `prisma` from `@sentinel/database` in routes
- MUST use repositories when possible (NOT direct Prisma queries)
- MUST NOT use global prisma singleton

**Why**: Routes must support test injection. The global prisma singleton can't be replaced during tests, causing `password authentication failed for user 'placeholder'` errors.

**Response Structure**:

- MUST return `{ status: <number> as const, body: <response> }` from all handlers
- MUST include `as const` on status codes for type inference
- MUST NOT return status without `as const` (type error)

**Type Mapping**:

- MUST convert repository types to API response types (use mapping functions)
- MUST convert Date objects to ISO strings
- MUST use null for optional fields (NOT undefined)
- MUST NOT return repository types directly

**Error Handling**:

- MUST handle all error cases: 400, 401, 404, 409, 500
- MUST wrap repository calls in try/catch
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

1. Create Valibot schema in @sentinel/contracts/src/schemas/
2. Create ts-rest contract in @sentinel/contracts/src/contracts/
3. Export from @sentinel/contracts/src/index.ts
4. Implement route with direct async function
5. Mount route in app.ts using createExpressEndpoints()
6. Write integration tests with Supertest

**When handling errors**:

1. Wrap repository call in try/catch
2. Check for null (return 404)
3. Check for Prisma unique constraint (return 409)
4. Return 500 for unexpected errors

## Quick Reference

### Database Access Patterns

**Correct Database Usage**:

```typescript
// ✅ Good - Use database service
import { getPrismaClient } from '../lib/database.js'

// For repositories
const memberRepo = new MemberRepository(getPrismaClient())

// For raw queries (when necessary)
const result = await getPrismaClient().$queryRaw`SELECT 1`
```

**Incorrect Usage**:

```typescript
// ❌ Bad - Global prisma (breaks tests)
import { prisma } from '@sentinel/database'

const memberRepo = new MemberRepository(prisma)
const result = await prisma.$queryRaw`SELECT 1`
```

**Best Practice - Use Repositories**:

```typescript
// ✅ Best - Repository handles database access
import { getPrismaClient } from '../lib/database.js'
import { MemberRepository } from '../repositories/member-repository.js'

const memberRepo = new MemberRepository(getPrismaClient())
const member = await memberRepo.findById(id)
```

### Route Handler Pattern

```typescript
import { initServer } from '@ts-rest/express'
import { memberContract } from '@sentinel/contracts'
import { MemberRepository } from '../repositories/member-repository.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const memberRepo = new MemberRepository(getPrismaClient())

export const membersRouter = s.router(memberContract, {
  getMemberById: async ({ params }) => {
    try {
      const member = await memberRepo.findById(params.id)

      if (!member) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: toApiFormat(member),
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch member',
        },
      }
    }
  },
})
```

### Type Mapping Function

```typescript
function toApiFormat(member: Member): MemberResponse {
  return {
    id: member.id,
    serviceNumber: member.serviceNumber,
    rank: member.rank,
    firstName: member.firstName,
    lastName: member.lastName,
    middleInitial: member.initials || null, // Renamed + nullable
    email: member.email || null, // Nullable
    phoneNumber: member.mobilePhone || member.homePhone || null, // Combined
    divisionId: member.divisionId,
    badgeId: member.badgeId || null,
    createdAt: member.createdAt.toISOString(), // Date → ISO string
    updatedAt: member.updatedAt?.toISOString() || null,
  }
}
```

### POST (Create) Pattern

```typescript
createMember: async ({ body }) => {
  try {
    const member = await memberRepo.create({
      serviceNumber: body.serviceNumber,
      rank: body.rank,
      firstName: body.firstName,
      lastName: body.lastName,
      divisionId: body.divisionId,
      // ... map other fields
    })

    return {
      status: 201 as const,
      body: toApiFormat(member),
    }
  } catch (error) {
    // Handle Prisma unique constraint
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return {
        status: 409 as const,
        body: {
          error: 'CONFLICT',
          message: `Member with service number '${body.serviceNumber}' already exists`,
        },
      }
    }

    return {
      status: 500 as const,
      body: {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create member',
      },
    }
  }
}
```

### GET with Pagination

```typescript
getMembers: async ({ query }) => {
  try {
    const page = query.page || 1
    const limit = query.limit || 50

    const filters: any = {}
    if (query.divisionId) filters.divisionId = query.divisionId
    if (query.search) filters.search = query.search

    const result = await memberRepo.findPaginated({ page, limit }, filters)
    const totalPages = Math.ceil(result.total / limit)

    return {
      status: 200 as const,
      body: {
        members: result.members.map(toApiFormat),
        total: result.total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    return {
      status: 500 as const,
      body: {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch members',
      },
    }
  }
}
```

### PATCH (Update) Pattern

```typescript
updateMember: async ({ params, body }) => {
  try {
    const member = await memberRepo.update(params.id, {
      serviceNumber: body.serviceNumber,
      rank: body.rank,
      // ... other fields
    })

    return {
      status: 200 as const,
      body: toApiFormat(member),
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return {
        status: 404 as const,
        body: {
          error: 'NOT_FOUND',
          message: `Member with ID '${params.id}' not found`,
        },
      }
    }

    return {
      status: 500 as const,
      body: {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update member',
      },
    }
  }
}
```

### DELETE Pattern

```typescript
deleteMember: async ({ params }) => {
  try {
    await memberRepo.delete(params.id)

    return {
      status: 200 as const,
      body: {
        success: true,
        message: 'Member deleted successfully',
      },
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return {
        status: 404 as const,
        body: {
          error: 'NOT_FOUND',
          message: `Member with ID '${params.id}' not found`,
        },
      }
    }

    return {
      status: 500 as const,
      body: {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete member',
      },
    }
  }
}
```

### Mounting Routes in app.ts

```typescript
import { createExpressEndpoints } from '@ts-rest/express'
import { memberContract } from '@sentinel/contracts'
import { membersRouter } from './routes/members.js'

// Mount ts-rest routes
createExpressEndpoints(memberContract, membersRouter, app)
```

---

**Authentication**: Applied globally via middleware in app.ts, NOT in individual route handlers.

**Validation**: Handled by Valibot schemas in @sentinel/contracts, NOT in routes.

**Related**: @sentinel/contracts (schemas & contracts), @apps/backend/src/middleware/CLAUDE.md (middleware), @apps/backend/src/repositories/CLAUDE.md (repositories)
