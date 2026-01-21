# CLAUDE Rules: API Contracts Package

Type-safe REST API contracts using ts-rest and Valibot for shared validation between backend and frontend.

---

## Scope
Applies when creating or modifying: `packages/contracts/src/schemas/`, `packages/contracts/src/contracts/`

## Non-Negotiables (MUST / MUST NOT)

**Valibot Schemas**:
- MUST use Valibot v1.2.0+ `pipe()` API (NOT array-based pipelines)
- MUST provide custom error messages for user-facing validation
- MUST use `v.picklist()` for enums (NOT string literals)
- MUST transform query params to correct types (string → number)
- MUST make ALL fields optional in update schemas

**Type Inference**:
- MUST export types using `v.InferOutput<typeof Schema>`
- MUST use `v.InferInput` for types before transformations
- MUST use `v.InferOutput` for types after transformations

**ts-rest Contracts**:
- MUST include all relevant status codes in `responses` (200, 201, 400, 401, 404, 409, 500)
- MUST provide `summary` and `description` for OpenAPI documentation
- MUST use Valibot schemas for pathParams, query, body validation
- MUST define specific paths BEFORE parameterized paths (e.g., `/stats` before `/:id`)
- MUST add `body: c.type<undefined>()` for GET/DELETE endpoints with no body

**Naming Conventions**:
- MUST use descriptive schema names: `CreateXSchema`, `UpdateXSchema`, `XResponseSchema`
- MUST use camelCase for contract route names

**Business Logic**:
- MUST NOT validate business logic in schemas (e.g., "badge must be unassigned")
- MUST document business rules that schemas can't enforce

## Defaults (SHOULD)

**Schema Organization**:
- SHOULD group related schemas in same file (member.schema.ts for all member schemas)
- SHOULD export types alongside schemas

**Validation**:
- SHOULD use descriptive error messages for validation failures
- SHOULD use `v.pipe()` for complex validation chains

**Contracts**:
- SHOULD include comprehensive OpenAPI metadata (summary, description)

## Workflow

**When adding new API endpoint**:
1. Create/update Valibot schema in `src/schemas/[resource].schema.ts`
2. Export types using `v.InferOutput<>`
3. Create/update ts-rest contract in `src/contracts/[resource].contract.ts`
4. Export contract and schemas from `src/index.ts`
5. Use contract in backend route implementation

**When adding validation**:
1. Use `v.pipe()` for multi-step validation
2. Provide custom error messages
3. Transform query params to correct types
4. Test validation with both valid and invalid inputs

## Quick Reference

### Valibot Schema Patterns

```typescript
import * as v from 'valibot'

// Object schema
export const MemberSchema = v.object({
  id: v.string(),
  serviceNumber: v.string(),
  rank: v.string(),
})

// Infer TypeScript type
export type Member = v.InferOutput<typeof MemberSchema>

// Validation pipes
export const CreateMemberSchema = v.object({
  serviceNumber: v.pipe(
    v.string('Service number is required'),
    v.minLength(1, 'Service number cannot be empty'),
    v.maxLength(20, 'Service number must be at most 20 characters')
  ),
  email: v.optional(
    v.pipe(
      v.string(),
      v.email('Invalid email format'),
      v.maxLength(100)
    )
  ),
})

// Enums
export const RankEnum = v.picklist([
  'AB', 'LS', 'MS', 'PO2', 'PO1', 'CPO2', 'CPO1'
])

// Optional and nullable
export const UpdateMemberSchema = v.object({
  email: v.optional(v.nullable(v.pipe(v.string(), v.email()))),  // undefined | null | string
  phoneNumber: v.optional(v.string()),  // undefined | string
  middleInitial: v.nullable(v.string()),  // null | string
})
```

### ts-rest Contract Pattern

```typescript
import { initContract } from '@ts-rest/core'
import * as v from 'valibot'

const c = initContract()

export const memberContract = c.router({
  getMembers: {
    method: 'GET',
    path: '/api/members',
    query: MemberListQuerySchema,
    responses: {
      200: MemberListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all members',
    description: 'Get paginated list of members with optional filtering',
  },

  getMemberById: {
    method: 'GET',
    path: '/api/members/:id',
    pathParams: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    responses: {
      200: MemberResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get member by ID',
  },
})
```

### Route Ordering (CRITICAL)

```typescript
// ✅ Correct - Specific paths before parameterized paths
export const badgeContract = c.router({
  getBadges: {
    method: 'GET',
    path: '/api/badges',  // Collection endpoint
  },

  getBadgeStats: {
    method: 'GET',
    path: '/api/badges/stats',  // Specific path - BEFORE :id
    body: c.type<undefined>(),
  },

  getBadgeBySerial: {
    method: 'GET',
    path: '/api/badges/serial/:serialNumber',  // Specific path - BEFORE :id
  },

  getBadgeById: {
    method: 'GET',
    path: '/api/badges/:id',  // Parameterized - AFTER specific paths
    pathParams: IdParamSchema,
  },
})

// ❌ Wrong - Parameterized path will match specific paths
export const badgeContract = c.router({
  getBadgeById: {
    method: 'GET',
    path: '/api/badges/:id',  // Will match '/badges/stats' as id='stats'
  },

  getBadgeStats: {
    method: 'GET',
    path: '/api/badges/stats',  // Unreachable - :id already matched
  },
})
```

**Why**: Express/ts-rest match routes in definition order. `/api/badges/:id` will match `/api/badges/stats` with `id='stats'` if defined first.

### Type Inference

```typescript
// Input types (before transformations)
export type CreateMemberInput = v.InferInput<typeof CreateMemberSchema>

// Output types (after transformations)
export type CreateMemberOutput = v.InferOutput<typeof CreateMemberSchema>

// For schemas without transformations, Input and Output are the same
export type MemberResponse = v.InferOutput<typeof MemberResponseSchema>
```

### InferInput vs InferOutput

```typescript
const QuerySchema = v.object({
  page: v.pipe(
    v.string(),           // Input: string
    v.transform(Number),  // Transformation
    v.number()           // Output: number
  ),
})

type Input = v.InferInput<typeof QuerySchema>   // { page: string }
type Output = v.InferOutput<typeof QuerySchema> // { page: number }
```

### Usage in Backend

```typescript
import { initServer } from '@ts-rest/express'
import { memberContract } from '@sentinel/contracts'

const s = initServer()

export const membersRouter = s.router(memberContract, {
  createMember: async ({ body }) => {
    // body is already validated and typed as CreateMemberInput
    const member = await memberRepo.create(body)

    return {
      status: 201 as const,
      body: toApiFormat(member),
    }
  },
})
```

### Usage in Frontend

```typescript
import { initClient } from '@ts-rest/core'
import { apiContract } from '@sentinel/contracts'

const client = initClient(apiContract, {
  baseUrl: 'http://localhost:3000',
})

// Fully type-safe API calls
const result = await client.members.createMember({
  body: {
    serviceNumber: 'SN12345',
    rank: 'AB',
    firstName: 'John',
    lastName: 'Doe',
    divisionId: 'uuid-here',
  },
})

if (result.status === 201) {
  console.log('Created:', result.body) // Typed as MemberResponse
}
```

---

**Why Valibot**: 90% smaller than Zod, modular architecture, full type inference, fast validation, composable

**ESM Note**: Package configured as ESM module (`"type": "module"`)

**Related**: @apps/backend/src/routes/CLAUDE.md (route implementation), @apps/backend/src/middleware/CLAUDE.md (validation)
