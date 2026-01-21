---
type: reference
title: "Sentinel Architecture Reference"
status: published
created: 2026-01-20
last_updated: 2026-01-21
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - architecture
    - tech stack
    - monorepo
    - technology choices
  token_budget: 300
---

# Sentinel Architecture Reference

Complete technical architecture and technology stack for the Sentinel RFID Attendance Tracking System.

## Monorepo Structure

**Type**: pnpm workspaces

**Components**:
- Backend application (`apps/backend/`)
- Frontend application (`apps/frontend/` - TBD)
- Shared packages (`packages/`)

## Technology Stack

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| **Runtime** | Node.js | 24.x | NOT Bun (HeroUI incompatibility) |
| **Package Manager** | pnpm | 10.x | Workspace support |
| **Backend Framework** | Express | 4.x | REST API server |
| **Database ORM** | Prisma | 7.x | Schema management, migrations |
| **Query Builder** | Kysely | Latest | Type-safe SQL queries |
| **Authentication** | better-auth | 1.4.x | Sessions, API keys, RBAC |
| **API Contracts** | ts-rest | 3.53.0-rc.1 | Standard Schema support (Zod 4, Valibot 1.x) |
| **Validation** | Valibot | 1.2.x | Schema validation |
| **Real-time** | Socket.IO | 4.x | Attendance events, kiosk updates |
| **Testing Framework** | Vitest | 4.x | Unit + integration tests |
| **Test Containers** | Testcontainers | 11.x | Real database for tests |
| **API Testing** | Supertest | 7.x | HTTP endpoint testing |
| **Frontend** | TBD | - | Avoiding HeroUI |

## Key Architectural Features

### RFID Integration
- Hardware reader integration for badge scanning
- Real-time check-in/check-out events
- Socket.IO event broadcasting

### Real-time Updates
- Socket.IO server for live updates
- Kiosk mode support
- Admin dashboard live data

### Type Safety
- End-to-end type safety with ts-rest
- Shared contracts between frontend/backend
- Compile-time validation

### Testing Strategy
- **70%** Integration tests (real database)
- **15%** Unit tests (business logic)
- **15%** E2E tests (full user flows)

### Security
- better-auth for authentication
- API key management
- Role-based access control (RBAC)

## Data Layer

### Prisma (Schema & Migrations)
- Database schema definition
- Migration management
- Type generation

### Kysely (Queries)
- Type-safe SQL query builder
- Complex queries and joins
- Better control than Prisma Client

## API Layer

### ts-rest Contracts
- Shared type definitions
- Client/server validation
- OpenAPI documentation generation

### Express Routes
- RESTful endpoints
- Middleware integration
- Error handling

## Real-time Layer

### Socket.IO Events
- `checkin:scan` - Badge scanned
- `checkin:update` - Status changed
- `kiosk:refresh` - Kiosk data update
- `admin:notification` - Admin alerts

## Package Structure

### `packages/database`
- Prisma schema
- Kysely client
- Database utilities

### `packages/contracts`
- ts-rest contracts
- Valibot schemas
- Shared types

### `packages/types`
- Common TypeScript types
- Enums and constants

## Related Documentation

- [Quick Commands Reference](commands.md)
- [Environment Variables Reference](environment.md)
- [Testing Philosophy](../../cross-cutting/testing/CLAUDE.md)
- [Backend Architecture](../../../apps/backend/CLAUDE.md)
