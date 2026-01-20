# Sentinel Backend - Architecture Documentation

## Overview

Express.js backend for the Sentinel RFID attendance tracking system. Built with Node.js 22, TypeScript strict mode, and a testing-first approach using Testcontainers for integration testing.

**Status**: Phase 2 Complete (Infrastructure + Core Routes)
**Test Coverage**: ~88% (repositories), Route testing in Phase 3
**Architecture**: Monorepo package (`@sentinel/backend`)

---

## Phase 2 Architecture (Current State)

### Authentication System

**better-auth** with dual authentication support:
- **Session-based** (web app): Cookie or Bearer token authentication with 7-day expiry
- **API Key** (kiosks): Custom validation via middleware (to be implemented)

**Configuration**: [src/lib/auth.ts](src/lib/auth.ts)
- Prisma adapter for database integration
- Email/password authentication enabled
- 7-day session expiry with 24-hour refresh
- 5 database tables: User, Session, Account, Verification, ApiKey

**Middleware**: [src/middleware/auth.ts](src/middleware/auth.ts)
- `requireAuth(required)` - Validates session or API key
- `requireUser()` - Requires user session (not API key)
- `requireApiKey(scopes)` - Requires API key with optional scope validation
- `optionalAuth` - Non-blocking authentication

**Note**: better-auth API key plugin was not available in v1.0.0, so custom API key validation is implemented via middleware (currently stubbed).

---

### Middleware Stack

**Execution Order** (as configured in [src/app.ts](src/app.ts)):

1. **Security** (`helmet`) - HTTP security headers (CSP, XSS protection)
2. **CORS** - Configurable origin whitelist, credentials support
3. **Compression** (`compression`) - Response compression
4. **Body Parsing** - JSON (10MB limit) and URL-encoded
5. **Cookie Parser** - Session cookie handling
6. **Request Logger** - Correlation ID generation and logging
7. **Rate Limiting** - Applied to `/api` routes
8. **Better-Auth Routes** - Mounted at `/api/auth/*`
9. **Application Routes** - ts-rest endpoints
10. **404 Handler** - Not found responses
11. **Error Handler** - Centralized error handling (must be last)

**See**: [src/middleware/CLAUDE.md](src/middleware/CLAUDE.md) for detailed middleware documentation.

---

### Logging Infrastructure

**Winston** structured logging with correlation ID tracking:

**Configuration**: [src/lib/logger.ts](src/lib/logger.ts)
- Module-specific loggers: `api`, `db`, `auth`, `ws`, `service`
- AsyncLocalStorage for request context (correlation IDs, user IDs)
- JSON format with timestamps and error stack traces
- Configurable log levels via `LOG_LEVEL` environment variable

**Usage**:
```typescript
import { apiLogger } from '@/lib/logger.js'

apiLogger.info('Request received', { path: req.path, method: req.method })
apiLogger.error('Database error', { error: err.message, stack: err.stack })
```

**Correlation IDs**:
- Generated via `X-Correlation-ID` header (or created if missing)
- Tracked across async operations via AsyncLocalStorage
- Included in all log entries and response headers
- Enables end-to-end request tracing for debugging

---

### Route Implementation

**ts-rest Pattern** (Correct Pattern - Phase 2):

Routes use **direct async functions**, NOT middleware arrays or handler objects.

**Example** ([src/routes/members.ts](src/routes/members.ts)):
```typescript
import { initServer } from '@ts-rest/express'
import { memberContract } from '@sentinel/contracts'

const s = initServer()

export const membersRouter = s.router(memberContract, {
  // Direct async function - NOT { middleware: [], handler: async () => {} }
  getMembers: async ({ query }) => {
    const result = await memberRepo.findPaginated({ page, limit }, filters)

    // Response must include 'as const' for type safety
    return {
      status: 200 as const,
      body: {
        members: result.members.map(toApiFormat),
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    }
  },

  getMemberById: async ({ params }) => {
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
  },
})
```

**Key Patterns**:
- ✅ Direct async functions
- ✅ `status: X as const` for type inference
- ✅ Error responses with error codes
- ✅ Repository injection via constructor
- ❌ NO middleware arrays in route handlers
- ❌ NO handler wrapper objects

**See**: [src/routes/CLAUDE.md](src/routes/CLAUDE.md) for complete route implementation patterns.

---

### Implemented Routes

**Phase 2.3 Complete** - 28 endpoints across 4 resources:

#### 1. Members ([src/routes/members.ts](src/routes/members.ts)) - 6 endpoints
- `GET /api/members` - List with pagination/filtering
- `GET /api/members/:id` - Get by ID
- `POST /api/members` - Create member
- `PATCH /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member
- `GET /api/members/search/:serviceNumber` - Search by service number

#### 2. Checkins ([src/routes/checkins.ts](src/routes/checkins.ts)) - 8 endpoints
- `GET /api/checkins` - List with pagination/filtering
- `GET /api/checkins/:id` - Get by ID
- `POST /api/checkins` - Create single checkin
- `POST /api/checkins/bulk` - Bulk create (offline sync)
- `PATCH /api/checkins/:id` - Update checkin
- `DELETE /api/checkins/:id` - Delete checkin
- `GET /api/checkins/presence` - Current presence stats by division
- `GET /api/members/:id/checkins` - Get member's checkin history

#### 3. Divisions ([src/routes/divisions.ts](src/routes/divisions.ts)) - 5 endpoints
- `GET /api/divisions` - List all divisions with member counts
- `GET /api/divisions/:id` - Get by ID
- `POST /api/divisions` - Create division
- `PATCH /api/divisions/:id` - Update division
- `DELETE /api/divisions/:id` - Delete (if no members assigned)

#### 4. Badges ([src/routes/badges.ts](src/routes/badges.ts)) - 9 endpoints
- `GET /api/badges` - List with filtering (assigned/unassigned)
- `GET /api/badges/:id` - Get by ID
- `GET /api/badges/serial/:serialNumber` - Get by serial number
- `POST /api/badges` - Create badge
- `PATCH /api/badges/:id` - Update badge
- `POST /api/badges/:id/assign` - Assign to member/visitor
- `POST /api/badges/:id/unassign` - Unassign badge
- `DELETE /api/badges/:id` - Delete badge
- `GET /api/badges/stats` - Badge statistics

#### Health Checks ([src/routes/health.ts](src/routes/health.ts)) - 4 endpoints
- `GET /health` - Overall health (DB connectivity)
- `GET /ready` - Kubernetes readiness probe
- `GET /live` - Kubernetes liveness probe
- `GET /metrics` - Performance metrics

---

## Project Structure

```
apps/backend/
├── src/
│   ├── index.ts                 # Application entry point with graceful shutdown
│   ├── app.ts                   # Express app configuration
│   ├── lib/
│   │   ├── auth.ts             # better-auth configuration
│   │   └── logger.ts           # Winston logger with correlation IDs
│   ├── middleware/
│   │   ├── auth.ts             # Authentication middleware
│   │   ├── error-handler.ts   # Centralized error handling
│   │   ├── rate-limit.ts       # Rate limiting (Redis-backed)
│   │   └── request-logger.ts  # Correlation ID tracking
│   ├── routes/
│   │   ├── health.ts           # Health check endpoints
│   │   ├── members.ts          # Member CRUD routes
│   │   ├── checkins.ts         # Checkin routes + presence
│   │   ├── divisions.ts        # Division management
│   │   └── badges.ts           # Badge lifecycle + assignment
│   └── repositories/           # 14 repositories (Phase 1)
│       ├── member-repository.ts
│       ├── badge-repository.ts
│       ├── checkin-repository.ts
│       └── ...                 # (11 more)
├── tests/
│   ├── setup.ts                # Global test configuration
│   ├── helpers/
│   │   ├── testcontainers.ts  # PostgreSQL test database helper
│   │   └── factories.ts       # Test data factories
│   └── integration/
│       └── repositories/       # 477 integration tests (Phase 1)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Dependencies

### Core
- `express` - Web framework
- `better-auth` - Authentication with Prisma adapter
- `@ts-rest/express` - Type-safe REST API framework
- `@sentinel/database` - Prisma client (workspace package)
- `@sentinel/contracts` - API schemas and contracts (workspace package)
- `@sentinel/types` - Shared TypeScript types (workspace package)

### Security & Middleware
- `helmet` - HTTP security headers
- `cors` - CORS configuration
- `compression` - Response compression
- `cookie-parser` - Cookie parsing for sessions
- `express-rate-limit` - Rate limiting

### Logging & Monitoring
- `winston` - Structured logging
- AsyncLocalStorage (built-in) - Request context tracking

### Testing
- `vitest` - Test runner with coverage
- `@testcontainers/postgresql` - Real PostgreSQL for integration tests
- `testcontainers` - Container management
- `supertest` - HTTP testing (Phase 3)
- `@types/supertest` - TypeScript types

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sentinel

# Server
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=debug

# Rate Limiting (optional)
ENABLE_RATE_LIMITING=true

# Auth (to be configured when admin accounts are created)
# JWT_SECRET=<generated-secret>
# API_KEY_SECRET=<generated-secret>
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (with hot reload)
pnpm dev

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Build for production
pnpm build

# Start production server
pnpm start
```

---

## Testing Strategy

**Integration-First Approach**: See [testing-strategy.md](../../.claude/rules/testing-strategy.md)

### Phase 1 (Complete)
- ✅ 14 repositories migrated with dependency injection
- ✅ 477 integration tests using Testcontainers
- ✅ ~88% average coverage on repository layer
- ✅ Real PostgreSQL database for all tests

### Phase 2 (Current)
- ✅ Infrastructure and middleware stack
- ✅ 28 API endpoints implemented
- ⏳ Integration tests for routes (Phase 3)

### Phase 3 (Upcoming)
- Integration tests for all routes (15+ tests per route)
- Service layer migration with integration tests
- WebSocket implementation and testing
- Target: 80%+ overall coverage

---

## Phase 1 Repositories (Completed)

All 14 repositories migrated from develop branch with comprehensive integration tests:

1. ✅ **member-repository.ts** (69 tests, 78.96% coverage)
2. ✅ **badge-repository.ts** (29 tests, 97.31% coverage)
3. ✅ **checkin-repository.ts** (34 tests)
4. ✅ **visitor-repository.ts** (32 tests)
5. ✅ **admin-user-repository.ts** (34 tests)
6. ✅ **audit-repository.ts** (30 tests)
7. ✅ **division-repository.ts** (31 tests)
8. ✅ **event-repository.ts** (39 tests)
9. ✅ **tag-repository.ts** (32 tests)
10. ✅ **member-status-repository.ts** (27 tests)
11. ✅ **member-type-repository.ts** (27 tests)
12. ✅ **visit-type-repository.ts** (27 tests)
13. ✅ **badge-status-repository.ts** (27 tests)
14. ✅ **list-item-repository.ts** (39 tests)

**See**: [src/repositories/CLAUDE.md](src/repositories/CLAUDE.md) for repository patterns and testing guidelines.

---

## Next Steps (Phase 3)

1. **Route Integration Tests**: Add Supertest tests for all 28 endpoints (15+ tests each)
2. **Service Layer Migration**: Migrate 17 services from develop branch
3. **WebSocket Implementation**: Socket.IO with authentication middleware
4. **Remaining Routes**: 17 additional routes (visitors, events, alerts, etc.)
5. **OpenAPI Documentation**: Generate from ts-rest contracts

---

## Related Documentation

- [Testing Strategy](../../.claude/rules/testing-strategy.md) - Integration-first testing approach
- [Backend Rebuild Plan](../../docs/plans/active/backend-rebuild-plan.md) - Complete rebuild roadmap
- [Database Package](../../packages/database/CLAUDE.md) - Prisma schema and client
- [Contracts Package](../../packages/contracts/CLAUDE.md) - Valibot schemas and ts-rest contracts
- [Middleware Documentation](src/middleware/CLAUDE.md) - Middleware patterns and usage
- [Route Documentation](src/routes/CLAUDE.md) - ts-rest route implementation guide
- [Library Documentation](src/lib/CLAUDE.md) - Auth and logging utilities
