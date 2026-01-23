# Route Patterns

Code examples and patterns extracted from CLAUDE.md rules.

> **Note**: This file contains reference examples. The actual rules are in the corresponding CLAUDE.md file.

---

## Non-Negotiables (MUST / MUST NOT)

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

## Non-Negotiables (MUST / MUST NOT)

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

## Database Access Patterns

```typescript
// ✅ Good - Use database service
import { getPrismaClient } from '../lib/database.js'

// For repositories
const memberRepo = new MemberRepository(getPrismaClient())

// For raw queries (when necessary)
const result = await getPrismaClient().$queryRaw`SELECT 1`
```

## Database Access Patterns

```typescript
// ❌ Bad - Global prisma (breaks tests)
import { prisma } from '@sentinel/database'

const memberRepo = new MemberRepository(prisma)
const result = await prisma.$queryRaw`SELECT 1`
```

## Database Access Patterns

```typescript
// ✅ Best - Repository handles database access
import { getPrismaClient } from '../lib/database.js'
import { MemberRepository } from '../repositories/member-repository.js'

const memberRepo = new MemberRepository(getPrismaClient())
const member = await memberRepo.findById(id)
```

## Route Handler Pattern

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

## Type Mapping Function

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

## POST (Create) Pattern

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

## GET with Pagination

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

## PATCH (Update) Pattern

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

## DELETE Pattern

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

## Mounting Routes in app.ts

```typescript
import { createExpressEndpoints } from '@ts-rest/express'
import { memberContract } from '@sentinel/contracts'
import { membersRouter } from './routes/members.js'

// Mount ts-rest routes
createExpressEndpoints(memberContract, membersRouter, app)
```
