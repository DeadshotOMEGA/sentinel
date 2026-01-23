---
type: reference
title: 'Sentinel Architecture Reference'
status: published
created: 2026-01-20
last_updated: 2026-01-22
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

| Component             | Technology     | Version     | Notes                                        |
| --------------------- | -------------- | ----------- | -------------------------------------------- |
| **Runtime**           | Node.js        | 24.x        | NOT Bun (HeroUI incompatibility)             |
| **Package Manager**   | pnpm           | 10.x        | Workspace support                            |
| **Backend Framework** | Express        | 4.x         | REST API server                              |
| **Database ORM**      | Prisma         | 7.x         | Schema management, migrations                |
| **Query Builder**     | Kysely         | Latest      | Type-safe SQL queries                        |
| **Authentication**    | better-auth    | 1.4.x       | Sessions, API keys, RBAC                     |
| **API Contracts**     | ts-rest        | 3.53.0-rc.1 | Standard Schema support (Zod 4, Valibot 1.x) |
| **Validation**        | Valibot        | 1.2.x       | Schema validation                            |
| **Real-time**         | Socket.IO      | 4.x         | Attendance events, kiosk updates             |
| **Testing Framework** | Vitest         | 4.x         | Unit + integration tests                     |
| **Test Containers**   | Testcontainers | 11.x        | Real database for tests                      |
| **API Testing**       | Supertest      | 7.x         | HTTP endpoint testing                        |
| **Metrics**           | prom-client    | 15.x        | Prometheus metrics collection                |
| **API Documentation** | Swagger UI     | 5.x         | Interactive API docs                         |
| **API Reference**     | ReDoc          | 2.x         | Clean API reference                          |
| **Frontend**          | TBD            | -           | Avoiding HeroUI                              |

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

### Observability

- **API Documentation**: Swagger UI at `/docs`, ReDoc at `/redoc`
- **Metrics**: Prometheus metrics at `/metrics` endpoint
  - HTTP metrics (request rate, duration, active connections)
  - Database metrics (query duration, pool stats)
  - Authentication metrics (login attempts, active sessions)
  - Business metrics (check-ins, badges, visitors, events, DDS, security alerts)
  - Node.js defaults (CPU, memory, event loop, GC)
- **Logging**: Winston with correlation IDs via AsyncLocalStorage
- **Monitoring Stack** (Phase 3): Grafana + Loki + Prometheus (planned)

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

## Middleware Order

The Express middleware stack must be configured in this exact order for security and functionality:

```typescript
app.use(helmet())                    // 1. Security headers
app.use(cors())                      // 2. CORS
app.use(compression())               // 3. Response compression
app.use(express.json())              // 4. JSON parsing
app.use(express.urlencoded())        // 5. URL-encoded parsing
app.use(cookieParser())              // 6. Cookie parsing
app.use(requestLogger)               // 7. Correlation IDs + logging
app.use('/api', apiLimiter)          // 8. Rate limiting
app.use(healthRouter)                // 9. Health checks
app.all('/api/auth/*', authHandler)  // 10. better-auth routes
createExpressEndpoints(...)          // 11. Application routes (ts-rest)
app.use(notFoundHandler)             // 12. 404 handler
app.use(errorHandler)                // 13. Error handler (MUST BE LAST)
```

## Backend Project Structure

```
apps/backend/
├── src/
│   ├── app.ts                   # Express app + middleware config
│   ├── lib/                     # Auth + logging
│   ├── middleware/              # Auth, errors, rate limiting
│   ├── routes/                  # ts-rest routes
│   └── repositories/            # Data access
└── tests/                       # Integration tests
```

## Test Coverage Targets

| Layer        | Target | Enforcement       |
| ------------ | ------ | ----------------- |
| Repositories | 90%+   | CI fails if below |
| Routes       | 80%+   | CI fails if below |
| Services     | 85%+   | CI fails if below |
| Overall      | 80%+   | CI fails if below |

## Common Quick Commands

Development and testing:

```bash
# Development
pnpm dev                              # Start dev server with hot reload

# Testing
pnpm test                             # Run all tests
pnpm test:watch                       # Watch mode (TDD)
pnpm test:coverage                    # Generate coverage report
pnpm test member-repository.test.ts  # Run specific test

# Building
pnpm build                            # Build for production
pnpm typecheck                        # TypeScript validation

# Database
pnpm prisma generate                  # Regenerate Prisma client
pnpm prisma studio                    # Database GUI
```

## Environment Variables

Required and optional configuration for the backend:

```bash
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/sentinel"
JWT_SECRET="<random-256-bit-string>"
API_KEY_SECRET="<random-256-bit-string>"

# Optional
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_RATE_LIMITING=true
```

## Authentication Methods

| Client Type     | Method       | Details                      |
| --------------- | ------------ | ---------------------------- |
| Admin Web Panel | JWT Sessions | Email/password, 7-day expiry |
| Kiosk Displays  | API Keys     | Long-lived, rotatable        |
| RFID Readers    | API Keys     | Machine-to-machine           |

## Related Documentation

- [Quick Commands Reference](commands.md)
- [Environment Variables Reference](environment.md)
- [Testing Philosophy](../../cross-cutting/testing/CLAUDE.md)
- [Backend CLAUDE Rules](../../../apps/backend/CLAUDE.md)
