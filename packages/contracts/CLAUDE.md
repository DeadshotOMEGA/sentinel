# Sentinel API Contracts Package

Type-safe REST API contracts using **ts-rest** and **Valibot** for shared validation between backend and frontend.

---

## Overview

This package defines:
- **Valibot schemas** - Validation schemas for API requests/responses
- **ts-rest contracts** - Type-safe REST API definitions
- **Shared types** - TypeScript types inferred from schemas

**Benefits**:
- Single source of truth for API shape
- Type safety across client and server
- Runtime validation with Valibot (90% smaller than Zod)
- Automatic OpenAPI documentation generation

---

## Project Structure

```
packages/contracts/
├── src/
│   ├── schemas/           # Valibot validation schemas
│   │   ├── common.schema.ts      # Shared schemas (pagination, errors)
│   │   ├── member.schema.ts      # Member resource schemas
│   │   ├── checkin.schema.ts     # Checkin resource schemas
│   │   ├── division.schema.ts    # Division resource schemas
│   │   ├── badge.schema.ts       # Badge resource schemas
│   │   └── audit.schema.ts       # Audit resource schemas
│   ├── contracts/         # ts-rest API contracts
│   │   ├── member.contract.ts    # Member API endpoints
│   │   ├── checkin.contract.ts   # Checkin API endpoints
│   │   ├── division.contract.ts  # Division API endpoints
│   │   ├── badge.contract.ts     # Badge API endpoints
│   │   └── audit.contract.ts     # Audit API endpoints
│   └── index.ts           # Main API contract export
├── package.json
└── tsconfig.json
```

---

## Valibot Schemas

### Why Valibot?

- **90% smaller** than Zod (dependency size)
- **Modular architecture** - Only import what you need
- **Type inference** - Full TypeScript type inference
- **Fast validation** - Performance optimized
- **Composable** - Easy to build complex schemas

### Schema Patterns

#### Basic Object Schema

```typescript
import * as v from 'valibot'

export const MemberSchema = v.object({
  id: v.string(),
  serviceNumber: v.string(),
  rank: v.string(),
  firstName: v.string(),
  lastName: v.string(),
})

// Infer TypeScript type
export type Member = v.InferOutput<typeof MemberSchema>
```

#### Validation Pipes

Chain validators for complex rules:

```typescript
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
```

#### Enums

```typescript
export const RankEnum = v.picklist([
  'AB', 'LS', 'MS', 'PO2', 'PO1', 'CPO2', 'CPO1',
  'A/SLT', 'SLT', 'LT(N)', 'LCDR', 'CDR', 'CAPT', 'CMDRE'
])

export const DirectionEnum = v.picklist(['in', 'out'])
export const BadgeStatusEnum = v.picklist(['active', 'inactive', 'lost', 'damaged'])
```

#### Optional and Nullable

```typescript
export const UpdateMemberSchema = v.object({
  email: v.optional(v.nullable(v.pipe(v.string(), v.email()))),  // undefined or null or string
  phoneNumber: v.optional(v.string()),  // undefined or string
  middleInitial: v.nullable(v.string()),  // null or string
})
```

#### Transformations

```typescript
export const BadgeListQuerySchema = v.object({
  page: v.optional(
    v.pipe(
      v.string(),
      v.transform(Number),  // Convert string to number
      v.number(),
      v.minValue(1)
    )
  ),
  assignedOnly: v.optional(
    v.pipe(
      v.string(),
      v.transform((val) => val === 'true')  // Convert string to boolean
    )
  ),
})
```

---

## Schema Files

### `common.schema.ts`

**Purpose**: Shared schemas used across all resources

**Key Schemas**:
- `PaginationQuerySchema` - Query params for paginated lists (page, limit)
- `ErrorResponseSchema` - Standard error response format
- `MessageResponseSchema` - Success message response
- `IdParamSchema` - UUID path parameter validation

**Example**:
```typescript
export const PaginationQuerySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))),
})

export const ErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
  details: v.optional(v.any()),
})
```

### `member.schema.ts`

**Purpose**: Member resource validation schemas

**Key Schemas**:
- `CreateMemberSchema` - Create member request body
- `UpdateMemberSchema` - Update member request body (all fields optional)
- `MemberResponseSchema` - Member response format
- `MemberListQuerySchema` - Member list filtering (divisionId, search, status)
- `MemberListResponseSchema` - Paginated member list response

**Enums**:
- `RankEnum` - 14 Canadian Navy ranks (AB to CMDRE)
- `MemberStatusEnum` - active, inactive, deployed, retired

**Example**:
```typescript
export const CreateMemberSchema = v.object({
  serviceNumber: v.pipe(v.string(), v.minLength(1), v.maxLength(20)),
  rank: RankEnum,
  firstName: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  lastName: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  divisionId: v.pipe(v.string(), v.uuid()),
  email: v.optional(v.pipe(v.string(), v.email(), v.maxLength(100))),
  phoneNumber: v.optional(v.pipe(v.string(), v.maxLength(20))),
})

export const MemberResponseSchema = v.object({
  id: v.string(),
  serviceNumber: v.string(),
  rank: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  middleInitial: v.nullable(v.string()),
  email: v.nullable(v.string()),
  phoneNumber: v.nullable(v.string()),
  status: v.string(),
  divisionId: v.string(),
  badgeId: v.nullable(v.string()),
  notes: v.nullable(v.string()),
  createdAt: v.nullable(v.string()),
  updatedAt: v.nullable(v.string()),
})
```

### `checkin.schema.ts`

**Purpose**: Check-in/check-out resource validation schemas

**Key Schemas**:
- `CreateCheckinSchema` - Single checkin creation
- `BulkCreateCheckinSchema` - Batch checkin creation (kiosk sync)
- `UpdateCheckinSchema` - Update checkin (change direction/timestamp)
- `CheckinResponseSchema` - Checkin response with member details
- `CheckinListQuerySchema` - Filtering (memberId, direction, kioskId, date range)
- `PresenceStatusResponseSchema` - Real-time presence statistics

**Enums**:
- `DirectionEnum` - 'in' or 'out'

**Example**:
```typescript
export const CreateCheckinSchema = v.object({
  memberId: v.optional(v.pipe(v.string(), v.uuid())),
  badgeId: v.optional(v.pipe(v.string(), v.uuid())),
  direction: DirectionEnum,
  kioskId: v.pipe(v.string(), v.uuid()),
  timestamp: v.optional(v.pipe(v.string(), v.isoTimestamp())),
})

export const BulkCreateCheckinSchema = v.object({
  checkins: v.array(
    v.object({
      memberId: v.optional(v.pipe(v.string(), v.uuid())),
      badgeId: v.optional(v.pipe(v.string(), v.uuid())),
      direction: DirectionEnum,
      kioskId: v.pipe(v.string(), v.uuid()),
      timestamp: v.optional(v.pipe(v.string(), v.isoTimestamp())),
    })
  ),
})

export const PresenceStatusResponseSchema = v.object({
  totalPresent: v.number(),
  totalMembers: v.number(),
  byDivision: v.array(
    v.object({
      divisionId: v.string(),
      divisionName: v.string(),
      present: v.number(),
      total: v.number(),
    })
  ),
})
```

### `division.schema.ts`

**Purpose**: Division/department resource validation schemas

**Key Schemas**:
- `CreateDivisionSchema` - Create division with code and name
- `UpdateDivisionSchema` - Update division (all fields optional)
- `DivisionResponseSchema` - Division response format
- `DivisionListQuerySchema` - Search divisions
- `DivisionStatsResponseSchema` - Division statistics (member counts)

**Example**:
```typescript
export const CreateDivisionSchema = v.object({
  code: v.pipe(v.string(), v.minLength(1), v.maxLength(10)),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  description: v.optional(v.string()),
})

export const DivisionStatsResponseSchema = v.object({
  total: v.number(),
  byDivision: v.array(
    v.object({
      divisionId: v.string(),
      divisionName: v.string(),
      memberCount: v.number(),
    })
  ),
})
```

### `badge.schema.ts`

**Purpose**: Badge resource validation schemas

**Key Schemas**:
- `CreateBadgeSchema` - Create badge with serial number
- `UpdateBadgeSchema` - Update badge (all fields optional)
- `AssignBadgeSchema` - Assign badge to member/visitor
- `BadgeResponseSchema` - Badge response format
- `BadgeWithAssignmentResponseSchema` - Badge with assigned member/visitor details
- `BadgeListQuerySchema` - Filtering (assignmentType, status, assignedOnly)
- `BadgeStatsResponseSchema` - Badge statistics

**Enums**:
- `BadgeAssignmentTypeEnum` - 'member', 'visitor', 'unassigned'
- `BadgeStatusEnum` - 'active', 'inactive', 'lost', 'damaged'

**Example**:
```typescript
export const CreateBadgeSchema = v.object({
  serialNumber: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  assignmentType: v.optional(BadgeAssignmentTypeEnum),
  assignedToId: v.optional(v.pipe(v.string(), v.uuid())),
  status: v.optional(BadgeStatusEnum),
})

export const BadgeWithAssignmentResponseSchema = v.object({
  id: v.string(),
  serialNumber: v.string(),
  assignmentType: v.string(),
  assignedToId: v.nullable(v.string()),
  status: v.string(),
  lastUsed: v.nullable(v.string()),
  assignedTo: v.nullable(
    v.object({
      id: v.string(),
      name: v.string(),
      type: v.string(),  // 'member' or 'visitor'
    })
  ),
  createdAt: v.nullable(v.string()),
  updatedAt: v.nullable(v.string()),
})
```

### `audit.schema.ts`

**Purpose**: Audit log resource validation schemas

**Key Schemas**:
- `AuditLogResponseSchema` - Audit log entry format
- `AuditLogListQuerySchema` - Filtering (userId, entityType, action, date range)
- `AuditLogListResponseSchema` - Paginated audit log response

**Enums**:
- `AuditEntityTypeEnum` - member, badge, division, checkin, user
- `AuditActionEnum` - create, update, delete

**Example**:
```typescript
export const AuditLogResponseSchema = v.object({
  id: v.string(),
  userId: v.nullable(v.string()),
  entityType: v.string(),
  entityId: v.string(),
  action: v.string(),
  changes: v.any(),  // JSON object
  timestamp: v.string(),
})

export const AuditLogListQuerySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
  limit: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))),
  userId: v.optional(v.pipe(v.string(), v.uuid())),
  entityType: v.optional(AuditEntityTypeEnum),
  action: v.optional(AuditActionEnum),
  startDate: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  endDate: v.optional(v.pipe(v.string(), v.isoTimestamp())),
})
```

---

## ts-rest Contracts

### Contract Structure

Each contract defines:
- **HTTP method** - GET, POST, PATCH, DELETE
- **Path** - URL path with parameters
- **Request body** - Valibot schema for body
- **Query parameters** - Valibot schema for query string
- **Path parameters** - Valibot schema for URL params
- **Responses** - Status codes mapped to Valibot schemas
- **Metadata** - Summary, description, tags

### Contract Pattern

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
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get member by ID',
  },

  createMember: {
    method: 'POST',
    path: '/api/members',
    body: CreateMemberSchema,
    responses: {
      201: MemberResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new member',
  },

  updateMember: {
    method: 'PATCH',
    path: '/api/members/:id',
    pathParams: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    body: UpdateMemberSchema,
    responses: {
      200: MemberResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update member',
  },

  deleteMember: {
    method: 'DELETE',
    path: '/api/members/:id',
    pathParams: v.object({ id: v.pipe(v.string(), v.uuid()) }),
    responses: {
      200: MessageResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete member',
  },
})
```

### Main API Contract

All resource contracts are combined into a single API contract:

```typescript
// src/index.ts
import { initContract } from '@ts-rest/core'
import { memberContract } from './contracts/member.contract'
import { checkinContract } from './contracts/checkin.contract'
import { divisionContract } from './contracts/division.contract'
import { badgeContract } from './contracts/badge.contract'
import { auditContract } from './contracts/audit.contract'

const c = initContract()

export const apiContract = c.router({
  members: memberContract,
  checkins: checkinContract,
  divisions: divisionContract,
  badges: badgeContract,
  audit: auditContract,
})
```

---

## Contract Files

### `member.contract.ts`

**Endpoints**: 6 endpoints for member management

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/members` | List members (paginated, filterable) |
| GET | `/api/members/:id` | Get member by ID |
| GET | `/api/members/service-number/:serviceNumber` | Search by service number |
| POST | `/api/members` | Create new member |
| PATCH | `/api/members/:id` | Update member |
| DELETE | `/api/members/:id` | Delete member |

### `checkin.contract.ts`

**Endpoints**: 8 endpoints for checkin/checkout operations

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/checkins` | List checkins (paginated, filterable) |
| GET | `/api/checkins/:id` | Get checkin by ID |
| GET | `/api/checkins/presence` | Get real-time presence status |
| GET | `/api/checkins/member/:memberId` | Get member's checkin history |
| POST | `/api/checkins` | Create single checkin |
| POST | `/api/checkins/bulk` | Bulk create checkins (kiosk sync) |
| PATCH | `/api/checkins/:id` | Update checkin |
| DELETE | `/api/checkins/:id` | Delete checkin |

### `division.contract.ts`

**Endpoints**: 5 endpoints for division management

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/divisions` | List divisions (paginated) |
| GET | `/api/divisions/:id` | Get division by ID |
| GET | `/api/divisions/stats` | Get division statistics |
| POST | `/api/divisions` | Create division |
| PATCH | `/api/divisions/:id` | Update division |

### `badge.contract.ts`

**Endpoints**: 9 endpoints for badge management

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/badges` | List badges (paginated, filterable) |
| GET | `/api/badges/:id` | Get badge by ID |
| GET | `/api/badges/serial/:serialNumber` | Find badge by serial number |
| GET | `/api/badges/stats` | Get badge statistics |
| POST | `/api/badges` | Create badge |
| POST | `/api/badges/:id/assign` | Assign badge to member/visitor |
| POST | `/api/badges/:id/unassign` | Unassign badge |
| PATCH | `/api/badges/:id` | Update badge |
| DELETE | `/api/badges/:id` | Delete badge |

### `audit.contract.ts`

**Endpoints**: 2 endpoints for audit logging

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/audit` | List audit logs (paginated, filterable) |
| GET | `/api/audit/:id` | Get audit log by ID |

---

## Type Inference

Valibot provides full TypeScript type inference:

```typescript
import * as v from 'valibot'
import { CreateMemberSchema, MemberResponseSchema } from './schemas/member.schema'

// Input types (what backend receives)
export type CreateMemberInput = v.InferInput<typeof CreateMemberSchema>

// Output types (what backend returns after validation)
export type CreateMemberOutput = v.InferOutput<typeof CreateMemberSchema>

// For schemas without transformations, Input and Output are the same
export type MemberResponse = v.InferOutput<typeof MemberResponseSchema>

// Use in backend
async function createMember(data: CreateMemberInput): Promise<MemberResponse> {
  // TypeScript knows exact shape of data and return type
}

// Use in frontend
const member: MemberResponse = await api.members.createMember({
  body: {
    serviceNumber: 'SN12345',
    rank: 'AB',
    firstName: 'John',
    lastName: 'Doe',
    divisionId: 'uuid-here',
  },
})
```

### InferInput vs InferOutput

- **InferInput**: Type BEFORE transformations (e.g., string for numeric query param)
- **InferOutput**: Type AFTER transformations (e.g., number after transform)

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

---

## Validation Patterns

### Required vs Optional

```typescript
// Required field
serviceNumber: v.string()  // Must be present

// Optional field (can be undefined)
email: v.optional(v.string())  // undefined | string

// Nullable field (can be null)
notes: v.nullable(v.string())  // null | string

// Optional and nullable (can be undefined or null)
phoneNumber: v.optional(v.nullable(v.string()))  // undefined | null | string
```

### Custom Error Messages

```typescript
export const CreateMemberSchema = v.object({
  serviceNumber: v.pipe(
    v.string('Service number is required'),                    // Custom error for wrong type
    v.minLength(1, 'Service number cannot be empty'),          // Custom error for constraint
    v.maxLength(20, 'Service number must be at most 20 characters')
  ),
  email: v.optional(
    v.pipe(
      v.string(),
      v.email('Invalid email format'),                         // Custom error for email validation
    )
  ),
})
```

### Conditional Validation

```typescript
export const CreateCheckinSchema = v.object({
  memberId: v.optional(v.pipe(v.string(), v.uuid())),
  badgeId: v.optional(v.pipe(v.string(), v.uuid())),
  direction: DirectionEnum,
  kioskId: v.pipe(v.string(), v.uuid()),
})

// Business rule: Either memberId OR badgeId must be provided
// This is enforced in backend logic, not schema
// Schema allows both to be optional for flexibility
```

### Array Validation

```typescript
export const BulkCreateCheckinSchema = v.object({
  checkins: v.array(
    v.object({
      memberId: v.optional(v.pipe(v.string(), v.uuid())),
      direction: DirectionEnum,
      kioskId: v.pipe(v.string(), v.uuid()),
    }),
    'At least one checkin is required'  // Error message for empty array
  ),
})

// Min/max array length
export const BatchSchema = v.object({
  items: v.pipe(
    v.array(v.string()),
    v.minLength(1, 'At least one item required'),
    v.maxLength(100, 'Maximum 100 items allowed')
  ),
})
```

---

## Adding New Schemas

1. **Create schema file** in `src/schemas/`:

```typescript
// src/schemas/visitor.schema.ts
import * as v from 'valibot'

export const CreateVisitorSchema = v.object({
  firstName: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  lastName: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
  organization: v.optional(v.pipe(v.string(), v.maxLength(100))),
  purpose: v.pipe(v.string(), v.minLength(1)),
  hostMemberId: v.pipe(v.string(), v.uuid()),
})

export const VisitorResponseSchema = v.object({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  organization: v.nullable(v.string()),
  purpose: v.string(),
  hostMemberId: v.string(),
  checkInTime: v.nullable(v.string()),
  checkOutTime: v.nullable(v.string()),
  createdAt: v.nullable(v.string()),
})

export type CreateVisitorInput = v.InferOutput<typeof CreateVisitorSchema>
export type VisitorResponse = v.InferOutput<typeof VisitorResponseSchema>
```

2. **Create contract file** in `src/contracts/`:

```typescript
// src/contracts/visitor.contract.ts
import { initContract } from '@ts-rest/core'
import * as v from 'valibot'
import { CreateVisitorSchema, VisitorResponseSchema } from '../schemas/visitor.schema'
import { ErrorResponseSchema, MessageResponseSchema } from '../schemas/common.schema'

const c = initContract()

export const visitorContract = c.router({
  getVisitors: {
    method: 'GET',
    path: '/api/visitors',
    responses: {
      200: v.array(VisitorResponseSchema),
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all visitors',
  },

  createVisitor: {
    method: 'POST',
    path: '/api/visitors',
    body: CreateVisitorSchema,
    responses: {
      201: VisitorResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new visitor',
  },
})
```

3. **Add to main contract**:

```typescript
// src/index.ts
import { visitorContract } from './contracts/visitor.contract'

export const apiContract = c.router({
  members: memberContract,
  checkins: checkinContract,
  divisions: divisionContract,
  badges: badgeContract,
  audit: auditContract,
  visitors: visitorContract,  // Add new contract
})
```

4. **Export types**:

```typescript
// src/index.ts
export * from './schemas/visitor.schema'
export { visitorContract } from './contracts/visitor.contract'
```

---

## Best Practices

### DO

✅ Use Valibot pipes for complex validation (`v.pipe()`)
✅ Provide custom error messages for user-facing validation
✅ Use enums for fixed value sets (`v.picklist()`)
✅ Transform query params to correct types (string → number)
✅ Make update schemas have all optional fields
✅ Include all relevant status codes in contract responses
✅ Export types from schemas (`v.InferOutput<>`)
✅ Use descriptive schema names (CreateX, UpdateX, XResponse)
✅ Document business rules that schemas can't enforce

### DON'T

❌ Use `any` type - always define proper schemas
❌ Validate business logic in schemas (e.g., "badge must be unassigned")
❌ Duplicate validation logic between schema and backend
❌ Forget to transform query params to correct types
❌ Use required fields in update schemas (should be optional)
❌ Skip error response schemas in contracts
❌ Hardcode values that should be enums
❌ Mix validation and transformation concerns

---

## Usage Examples

### Backend Route Implementation

```typescript
import { s } from '@ts-rest/serverless'
import { memberContract } from '@sentinel/contracts'

export const membersRouter = s.router(memberContract, {
  createMember: async ({ body }) => {
    // body is already validated and typed as CreateMemberInput
    const member = await memberRepo.create({
      serviceNumber: body.serviceNumber,
      rank: body.rank,
      firstName: body.firstName,
      lastName: body.lastName,
      divisionId: body.divisionId,
      email: body.email,
      phoneNumber: body.phoneNumber,
    })

    // Return must match MemberResponseSchema
    return {
      status: 201 as const,
      body: {
        id: member.id,
        serviceNumber: member.serviceNumber,
        rank: member.rank,
        firstName: member.firstName,
        lastName: member.lastName,
        middleInitial: member.middleInitial ?? null,
        email: member.email ?? null,
        phoneNumber: member.phoneNumber ?? null,
        status: member.status,
        divisionId: member.divisionId,
        badgeId: member.badgeId ?? null,
        notes: member.notes ?? null,
        createdAt: member.createdAt?.toISOString() ?? null,
        updatedAt: member.updatedAt?.toISOString() ?? null,
      },
    }
  },
})
```

### Frontend API Client

```typescript
import { initClient } from '@ts-rest/core'
import { apiContract } from '@sentinel/contracts'

const client = initClient(apiContract, {
  baseUrl: 'http://localhost:3000',
  baseHeaders: {
    'Content-Type': 'application/json',
  },
})

// Fully type-safe API calls
async function createMember() {
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
    console.log('Created member:', result.body)
    // result.body is typed as MemberResponse
  } else if (result.status === 400) {
    console.error('Validation error:', result.body.message)
    // result.body is typed as ErrorResponse
  }
}
```

---

## Testing

### Schema Validation Testing

```typescript
import { describe, it, expect } from 'vitest'
import * as v from 'valibot'
import { CreateMemberSchema } from '../schemas/member.schema'

describe('CreateMemberSchema', () => {
  it('should validate valid member data', () => {
    const validData = {
      serviceNumber: 'SN12345',
      rank: 'AB',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: '123e4567-e89b-12d3-a456-426614174000',
    }

    const result = v.safeParse(CreateMemberSchema, validData)
    expect(result.success).toBe(true)
  })

  it('should reject invalid service number', () => {
    const invalidData = {
      serviceNumber: '',  // Empty string
      rank: 'AB',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: '123e4567-e89b-12d3-a456-426614174000',
    }

    const result = v.safeParse(CreateMemberSchema, invalidData)
    expect(result.success).toBe(false)
  })

  it('should reject invalid UUID', () => {
    const invalidData = {
      serviceNumber: 'SN12345',
      rank: 'AB',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: 'not-a-uuid',
    }

    const result = v.safeParse(CreateMemberSchema, invalidData)
    expect(result.success).toBe(false)
  })
})
```

---

## Related Documentation

- [Backend Routes](../../apps/backend/src/routes/CLAUDE.md) - Route implementation with ts-rest
- [Backend Middleware](../../apps/backend/src/middleware/CLAUDE.md) - Authentication and validation
- [Backend Architecture](../../apps/backend/CLAUDE.md) - Complete backend overview
- [ts-rest Documentation](https://ts-rest.com/) - Official ts-rest docs
- [Valibot Documentation](https://valibot.dev/) - Official Valibot docs
