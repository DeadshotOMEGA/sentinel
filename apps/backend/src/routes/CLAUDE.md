# Routes Documentation

Guide to implementing ts-rest routes in the Sentinel backend.

---

## ts-rest Pattern (Correct Pattern)

Routes use **direct async functions**, NOT middleware arrays or handler objects.

### ✅ Correct Pattern

```typescript
import { initServer } from '@ts-rest/express'
import { memberContract } from '@sentinel/contracts'

const s = initServer()

export const membersRouter = s.router(memberContract, {
  // Direct async function
  getMembers: async ({ query }) => {
    // Implementation here
    return {
      status: 200 as const,  // 'as const' required for type inference
      body: { members, total, page, limit }
    }
  },
})
```

### ❌ Incorrect Patterns

```typescript
// DON'T: Middleware array pattern
export const membersRouter = s.router(memberContract, {
  getMembers: {
    middleware: [requireAuth()],
    handler: async ({ query }) => { /* ... */ }
  }
})

// DON'T: Handler wrapper object
export const membersRouter = s.router(memberContract, {
  getMembers: {
    handler: async ({ query }) => { /* ... */ }
  }
})

// DON'T: Missing 'as const'
return {
  status: 200,  // Type error - should be 'as const'
  body: { ... }
}
```

---

## Response Structure

All route handlers must return an object with `status` and `body`:

```typescript
{
  status: <number> as const,
  body: <response type>
}
```

### Success Responses

```typescript
// 200 OK - Successful GET/PATCH
return {
  status: 200 as const,
  body: { id, name, email, ... }
}

// 201 Created - Successful POST
return {
  status: 201 as const,
  body: { id, name, email, ... }
}
```

### Error Responses

```typescript
// 400 Bad Request - Validation failure
return {
  status: 400 as const,
  body: {
    error: 'VALIDATION_ERROR',
    message: 'Invalid email format'
  }
}

// 401 Unauthorized - Missing/invalid auth
return {
  status: 401 as const,
  body: {
    error: 'UNAUTHORIZED',
    message: 'Authentication required'
  }
}

// 404 Not Found - Resource doesn't exist
return {
  status: 404 as const,
  body: {
    error: 'NOT_FOUND',
    message: `Member with ID '${params.id}' not found`
  }
}

// 409 Conflict - Duplicate/constraint violation
return {
  status: 409 as const,
  body: {
    error: 'CONFLICT',
    message: `Member with service number '${body.serviceNumber}' already exists`
  }
}

// 500 Internal Server Error - Unexpected errors
return {
  status: 500 as const,
  body: {
    error: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : 'Failed to process request'
  }
}
```

---

## Standard HTTP Status Codes

### Success (2xx)

| Code | Usage | Example |
|------|-------|---------|
| 200 OK | Successful GET, PATCH, DELETE | Get member by ID |
| 201 Created | Successful POST | Create new member |

### Client Errors (4xx)

| Code | Usage | Example |
|------|-------|---------|
| 400 Bad Request | Validation failure, invalid input | Invalid email format |
| 401 Unauthorized | Missing/invalid authentication | No Bearer token |
| 404 Not Found | Resource doesn't exist | Member ID not found |
| 409 Conflict | Duplicate, constraint violation | Service number already exists |

### Server Errors (5xx)

| Code | Usage | Example |
|------|-------|---------|
| 500 Internal Server Error | Unexpected errors | Database connection failed |

---

## Repository Integration

### Dependency Injection

Inject PrismaClient via constructor for testability:

```typescript
import { PrismaClient } from '@sentinel/database'
import { MemberRepository } from '../repositories/member-repository.js'

const prisma = new PrismaClient()
const memberRepo = new MemberRepository(prisma)

export const membersRouter = s.router(memberContract, {
  getMembers: async ({ query }) => {
    const result = await memberRepo.findPaginated({ page, limit }, filters)
    return { status: 200 as const, body: { ... } }
  },
})
```

**Benefits**:
- Testable (inject mock Prisma in tests)
- Consistent with repository pattern from Phase 1
- Supports transactions and connection pooling

---

### Error Handling

Handle repository errors and convert to HTTP status codes:

```typescript
getMemberById: async ({ params }) => {
  try {
    const member = await memberRepo.findById(params.id)

    if (!member) {
      return {
        status: 404 as const,
        body: {
          error: 'NOT_FOUND',
          message: `Member with ID '${params.id}' not found`
        }
      }
    }

    return {
      status: 200 as const,
      body: toApiFormat(member)
    }
  } catch (error) {
    return {
      status: 500 as const,
      body: {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch member'
      }
    }
  }
}
```

**Common Patterns**:
```typescript
// Repository returns null → 404
if (!resource) {
  return { status: 404 as const, body: { error: 'NOT_FOUND', ... } }
}

// Prisma unique constraint error → 409
if (error instanceof Error && error.message.includes('Unique constraint')) {
  return { status: 409 as const, body: { error: 'CONFLICT', ... } }
}

// Generic error → 500
return { status: 500 as const, body: { error: 'INTERNAL_ERROR', ... } }
```

---

## Type Mapping

### Repository Types → API Response Types

Repository types (from `@sentinel/types`) often differ from API response types (from `@sentinel/contracts`). Convert between them in routes.

**Example**:
```typescript
// Repository type (internal)
interface Member {
  id: string
  serviceNumber: string
  rank: string
  firstName: string
  lastName: string
  initials?: string        // Optional
  email?: string           // Optional
  divisionId: string
  badgeId?: string         // Optional
  createdAt: Date          // Date object
  updatedAt: Date          // Date object
}

// API response type (external)
interface MemberResponse {
  id: string
  serviceNumber: string
  rank: string
  firstName: string
  lastName: string
  middleInitial: string | null   // Renamed + nullable
  email: string | null           // Nullable
  phoneNumber: string | null     // Combined from multiple fields
  divisionId: string
  badgeId: string | null         // Nullable
  createdAt: string              // ISO string
  updatedAt: string | null       // ISO string + nullable
}
```

**Conversion Function**:
```typescript
function toApiFormat(member: Member): MemberResponse {
  return {
    id: member.id,
    serviceNumber: member.serviceNumber,
    rank: member.rank,
    firstName: member.firstName,
    lastName: member.lastName,
    middleInitial: member.initials || null,
    email: member.email || null,
    phoneNumber: member.mobilePhone || member.homePhone || null,  // Fallback chain
    divisionId: member.divisionId,
    badgeId: member.badgeId || null,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt?.toISOString() || null,
  }
}
```

---

## Route Examples

### GET with Pagination

```typescript
getMembers: async ({ query }) => {
  try {
    const page = query.page || 1
    const limit = query.limit || 50

    // Build filters from query parameters
    const filters: any = {}
    if (query.divisionId) filters.divisionId = query.divisionId
    if (query.search) filters.search = query.search
    if (query.status) filters.status = query.status

    const result = await memberRepo.findPaginated(
      { page, limit },
      filters
    )

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

---

### GET by ID

```typescript
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
}
```

---

### POST (Create)

```typescript
createMember: async ({ body }) => {
  try {
    const member = await memberRepo.create({
      serviceNumber: body.serviceNumber,
      rank: body.rank,
      firstName: body.firstName,
      lastName: body.lastName,
      initials: body.middleInitial,
      divisionId: body.divisionId,
      email: body.email,
      mobilePhone: body.phoneNumber,
      badgeId: body.badgeId,
    })

    return {
      status: 201 as const,
      body: toApiFormat(member),
    }
  } catch (error) {
    // Handle Prisma unique constraint violations
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

---

### PATCH (Update)

```typescript
updateMember: async ({ params, body }) => {
  try {
    const member = await memberRepo.update(params.id, {
      serviceNumber: body.serviceNumber,
      rank: body.rank,
      firstName: body.firstName,
      lastName: body.lastName,
      initials: body.middleInitial,
      divisionId: body.divisionId,
      email: body.email,
      mobilePhone: body.phoneNumber,
      badgeId: body.badgeId,
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

---

### DELETE

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

---

## Mounting Routes

Routes are mounted in [../app.ts](../app.ts) using `createExpressEndpoints`:

```typescript
import { createExpressEndpoints } from '@ts-rest/express'
import { memberContract, checkinContract } from '@sentinel/contracts'
import { membersRouter } from './routes/members.js'
import { checkinsRouter } from './routes/checkins.js'

// Mount ts-rest routers
createExpressEndpoints(memberContract, membersRouter, app)
createExpressEndpoints(checkinContract, checkinsRouter, app)
```

**Note**: Middleware (authentication, rate limiting, etc.) is applied globally in app.ts. Individual routes do NOT include middleware configuration.

---

## Adding New Routes

1. **Create Valibot Schema** (in `@sentinel/contracts/src/schemas/`)
   ```typescript
   // resource.schema.ts
   export const CreateResourceSchema = v.object({
     name: v.pipe(v.string(), v.minLength(1)),
     description: v.optional(v.string())
   })
   ```

2. **Create ts-rest Contract** (in `@sentinel/contracts/src/contracts/`)
   ```typescript
   // resource.contract.ts
   export const resourceContract = c.router({
     getResource: {
       method: 'GET',
       path: '/api/resources/:id',
       pathParams: IdParamSchema,
       responses: {
         200: ResourceResponseSchema,
         404: ErrorResponseSchema,
       },
     },
   })
   ```

3. **Export from Contracts Package**
   ```typescript
   // @sentinel/contracts/src/index.ts
   export * from './schemas/resource.schema.js'
   export * from './contracts/resource.contract.js'
   ```

4. **Implement Route** (in `apps/backend/src/routes/`)
   ```typescript
   // resources.ts
   export const resourcesRouter = s.router(resourceContract, {
     getResource: async ({ params }) => {
       // Implementation
     },
   })
   ```

5. **Mount Route** (in `apps/backend/src/app.ts`)
   ```typescript
   import { resourceContract } from '@sentinel/contracts'
   import { resourcesRouter } from './routes/resources.js'

   createExpressEndpoints(resourceContract, resourcesRouter, app)
   ```

---

## Testing Routes

### Integration Tests with Supertest

```typescript
import request from 'supertest'
import { app } from '@/app.js'
import { TestDatabase } from '@/tests/helpers/testcontainers.js'

describe('GET /api/members/:id', () => {
  const testDb = new TestDatabase()

  beforeAll(async () => {
    await testDb.start()
  }, 60000)

  afterAll(async () => {
    await testDb.stop()
  })

  beforeEach(async () => {
    await testDb.reset()
    await testDb.seed()
  })

  it('should return 200 with member data', async () => {
    const member = await testDb.prisma!.member.create({
      data: { /* ... */ }
    })

    const response = await request(app)
      .get(`/api/members/${member.id}`)
      .expect(200)

    expect(response.body).toMatchObject({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
    })
  })

  it('should return 404 when member not found', async () => {
    await request(app)
      .get('/api/members/non-existent-id')
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBe('NOT_FOUND')
      })
  })

  it('should return 401 without authentication', async () => {
    await request(app)
      .get('/api/members/123')
      .expect(401)
  })
})
```

---

## Best Practices

### DO

✅ Use direct async functions (not middleware/handler objects)
✅ Include `as const` on status codes
✅ Map repository types to API types
✅ Handle all error cases (404, 409, 500)
✅ Convert dates to ISO strings
✅ Use nullable types for optional fields
✅ Include correlation IDs in logs
✅ Validate input via Valibot schemas in contracts

### DON'T

❌ Use middleware arrays in route handlers
❌ Forget `as const` on status codes
❌ Return repository types directly (always convert)
❌ Expose internal error details
❌ Skip error handling
❌ Use undefined for optional fields (use null)
❌ Return Date objects (convert to ISO strings)
❌ Validate input in routes (use contract schemas)

---

## Related Documentation

- [Backend Architecture](../CLAUDE.md) - Complete backend overview
- [Contracts Package](../../../packages/contracts/CLAUDE.md) - Valibot schemas and ts-rest contracts
- [Middleware Documentation](../middleware/CLAUDE.md) - Authentication and error handling
- [Repository Pattern](../repositories/CLAUDE.md) - Data access layer
- [Testing Strategy](../../../.claude/rules/testing-strategy.md) - Integration testing approach
