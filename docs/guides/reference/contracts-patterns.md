---
type: reference
title: API Contracts Patterns
status: current
created: 2026-01-23
last_updated: 2026-01-23
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - valibot schemas
    - ts-rest contracts
    - type inference
    - api contract patterns
    - route ordering
  token_budget: 400
---

# API Contracts Patterns

Code patterns for Valibot schemas, ts-rest contracts, and type inference in the `packages/contracts` package.

## Valibot Schema Patterns

Basic schema structure with validation pipes and type inference:

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

// Validation pipes with custom error messages
export const CreateMemberSchema = v.object({
  serviceNumber: v.pipe(
    v.string('Service number is required'),
    v.minLength(1, 'Service number cannot be empty'),
    v.maxLength(20, 'Service number must be at most 20 characters')
  ),
  email: v.optional(v.pipe(v.string(), v.email('Invalid email format'), v.maxLength(100))),
})

// Enums using picklist (NOT string literals)
export const RankEnum = v.picklist(['AB', 'LS', 'MS', 'PO2', 'PO1', 'CPO2', 'CPO1'])

// Optional and nullable patterns
export const UpdateMemberSchema = v.object({
  email: v.optional(v.nullable(v.pipe(v.string(), v.email()))), // undefined | null | string
  phoneNumber: v.optional(v.string()), // undefined | string
  middleInitial: v.nullable(v.string()), // null | string
})
```

## ts-rest Contract Pattern

Complete contract definition with all required response statuses and OpenAPI metadata:

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

## Route Ordering (CRITICAL)

Define specific paths BEFORE parameterized paths to prevent route shadowing:

```typescript
// ✅ Correct - Specific paths before parameterized paths
export const badgeContract = c.router({
  getBadges: {
    method: 'GET',
    path: '/api/badges', // Collection endpoint
  },

  getBadgeStats: {
    method: 'GET',
    path: '/api/badges/stats', // Specific path - BEFORE :id
    body: c.type<undefined>(),
  },

  getBadgeBySerial: {
    method: 'GET',
    path: '/api/badges/serial/:serialNumber', // Specific path - BEFORE :id
  },

  getBadgeById: {
    method: 'GET',
    path: '/api/badges/:id', // Parameterized - AFTER specific paths
    pathParams: IdParamSchema,
  },
})

// ❌ Wrong - Parameterized path will match specific paths
export const badgeContract = c.router({
  getBadgeById: {
    method: 'GET',
    path: '/api/badges/:id', // Will match '/badges/stats' as id='stats'
  },

  getBadgeStats: {
    method: 'GET',
    path: '/api/badges/stats', // Unreachable - :id already matched
  },
})
```

**Why**: Express/ts-rest match routes in definition order. `/api/badges/:id` will match `/api/badges/stats` with `id='stats'` if defined first.

## Type Inference

Input vs output type inference for schemas with transformations:

```typescript
// Input types (before transformations)
export type CreateMemberInput = v.InferInput<typeof CreateMemberSchema>

// Output types (after transformations)
export type CreateMemberOutput = v.InferOutput<typeof CreateMemberSchema>

// For schemas without transformations, Input and Output are the same
export type MemberResponse = v.InferOutput<typeof MemberResponseSchema>

// InferInput vs InferOutput example
const QuerySchema = v.object({
  page: v.pipe(
    v.string(), // Input: string
    v.transform(Number), // Transformation
    v.number() // Output: number
  ),
})

type Input = v.InferInput<typeof QuerySchema> // { page: string }
type Output = v.InferOutput<typeof QuerySchema> // { page: number }
```

## Backend Usage

Implement routes with ts-rest server integration:

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

## Frontend Usage

Use ts-rest client for type-safe API calls:

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

## Why Valibot

- **90% smaller** than Zod
- **Modular architecture** - import only what you need
- **Full type inference** - complete TypeScript support
- **Fast validation** - optimized for performance
- **Composable** - combine validators with `v.pipe()`

## Configuration

Package is configured as ESM module (`"type": "module"` in package.json).
