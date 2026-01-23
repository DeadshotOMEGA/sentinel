# Sentinel Backend API

Backend API server for the Sentinel RFID attendance tracking system. Built with Express.js, Prisma ORM, Socket.IO, and ts-rest.

## Quick Start

### Prerequisites

- Node.js 24.x
- pnpm (NOT Bun - HeroUI incompatibility)
- Docker & Docker Compose (for PostgreSQL and Redis)

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Start Infrastructure

Start PostgreSQL and Redis:

```bash
docker-compose up -d
```

This starts:

- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`

### 3. Set Up Environment

Create `.env` file in `apps/backend/`:

```bash
# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://sentinel:sentinel@localhost:5432/sentinel?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
# Generate secure secrets: openssl rand -base64 32
JWT_SECRET=dev-jwt-secret-change-in-production
API_KEY_SECRET=dev-api-key-secret-change-in-production
SESSION_SECRET=dev-session-secret-change-in-production
SOCKET_IO_SECRET=dev-socketio-secret-change-in-production

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 4. Run Database Migrations

From the monorepo root:

```bash
cd packages/database
pnpm prisma migrate dev
```

### 5. Start Development Server

```bash
cd apps/backend
pnpm dev
```

API runs at: **http://localhost:3000**

### 5-Minute Test

```bash
# Check health endpoint
curl http://localhost:3000/health

# View API documentation
open http://localhost:3000/docs
```

## API Documentation

| Endpoint                                                                 | Description                                                 |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [http://localhost:3000/docs](http://localhost:3000/docs)                 | **Swagger UI** - Interactive API explorer with "Try it out" |
| [http://localhost:3000/redoc](http://localhost:3000/redoc)               | **ReDoc** - Clean, responsive API reference                 |
| [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json) | **OpenAPI 3.0 Spec** - Raw JSON specification               |

**All 63 API endpoints** are documented with request/response schemas, authentication requirements, and validation rules.

## Authentication

The API supports two authentication methods:

### 1. JWT Sessions (Admin Web Panel)

Used for admin users accessing the web interface.

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Returns JWT token
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "..." }
}

# Use token in subsequent requests
curl http://localhost:3000/api/members \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### 2. API Keys (Kiosks, RFID Readers)

Used for hardware devices and automated systems.

```bash
# Create API key (requires admin authentication)
curl -X POST http://localhost:3000/api/auth/api-keys \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Kiosk #1","permissions":["checkin:read","checkin:write"]}'

# Use API key
curl http://localhost:3000/api/checkins \
  -H "X-API-Key: sk_live_abc123..."
```

### Rate Limiting

- **100 requests per 15 minutes** per IP/API key
- Returns `429 Too Many Requests` when exceeded
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Development

### Available Commands

```bash
# Development
pnpm dev                  # Start dev server with hot reload
pnpm build                # Compile TypeScript to JavaScript
pnpm start                # Run production build

# Testing
pnpm test                 # Run all tests (477 repo + 157 route tests)
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Run tests with coverage report
pnpm test:ui              # Open Vitest UI

# Linting & Type Checking
pnpm typecheck            # Check TypeScript types
pnpm lint                 # Run ESLint
pnpm lint:fix             # Fix ESLint errors

# OpenAPI
pnpm openapi              # Generate OpenAPI spec from ts-rest contracts
```

### Project Structure

```
apps/backend/
├── src/
│   ├── routes/          # API route handlers (ts-rest)
│   ├── repositories/    # Data access layer (Prisma)
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware (auth, rate limit, etc.)
│   ├── lib/             # Utilities and helpers
│   ├── websocket/       # Socket.IO real-time events
│   ├── app.ts           # Express app configuration
│   └── index.ts         # Server entry point
├── tests/
│   ├── integration/     # Integration tests (repositories, routes)
│   └── setup.ts         # Test configuration
├── scripts/             # Utility scripts
├── openapi.json         # Generated OpenAPI specification
└── Dockerfile           # Production container image
```

## Testing

### Test Coverage

- **Repository Layer:** 88-90% coverage (477 tests)
- **Route Layer:** 80-85% coverage (157 tests)
- **Overall:** 70-80% coverage (adjusted for deferred services)

### Running Tests

```bash
# Run all tests (~5 minutes)
pnpm test

# Run specific test file
pnpm vitest run tests/integration/repositories/member-repository.test.ts

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
# View report: open coverage/index.html
```

### Test Infrastructure

- **Vitest** - Fast unit test runner
- **Testcontainers** - Isolated PostgreSQL instances per test suite
- **Supertest** - HTTP assertions for route tests
- **Integration-first approach** - 70% integration, 15% unit, 15% E2E

## Docker Deployment

### Option 1: Docker Compose (Recommended)

Start backend with all dependencies:

```bash
docker-compose --profile backend up -d
```

This starts:

- PostgreSQL
- Redis
- Backend API (http://localhost:3000)

### Option 2: Build Custom Image

```bash
# Build image
cd apps/backend
docker build -t sentinel-backend:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e JWT_SECRET=... \
  sentinel-backend:latest
```

### Health Checks

The container includes health checks:

```bash
# Check container health
docker ps --filter name=sentinel-backend

# View health endpoint
curl http://localhost:3000/health

# Expected response
{
  "status": "ok",
  "timestamp": "2026-01-23T12:00:00.000Z",
  "uptime": 123.45,
  "database": "connected",
  "redis": "connected"
}
```

## Architecture

### Core Technologies

- **Express.js** - HTTP server
- **Prisma ORM** - Type-safe database access
- **ts-rest** - End-to-end type-safe API contracts
- **better-auth** - Authentication & session management
- **Socket.IO** - Real-time WebSocket communication
- **Valibot** - Runtime validation
- **Helmet** - Security headers
- **Winston** - Structured logging

### API Resources (63 Endpoints)

| Resource               | Endpoints | Description              |
| ---------------------- | --------- | ------------------------ |
| `/api/members`         | 9         | Personnel management     |
| `/api/checkins`        | 8         | Check-in/out operations  |
| `/api/badges`          | 7         | Badge assignment         |
| `/api/events`          | 8         | Event management         |
| `/api/visitors`        | 7         | Visitor tracking         |
| `/api/divisions`       | 6         | Division/unit management |
| `/api/dds`             | 5         | DDS operations           |
| `/api/lockup`          | 4         | Lockup execution         |
| `/api/security-alerts` | 5         | Security monitoring      |
| `/api/alert-configs`   | 4         | Alert configuration      |

### WebSocket Channels (10)

Real-time updates via Socket.IO:

- `checkin:in` - New check-ins
- `checkin:out` - New check-outs
- `badge:assigned` - Badge assignments
- `badge:unassigned` - Badge returns
- `member:created` - New members
- `member:updated` - Member updates
- `event:created` - New events
- `security-alert:created` - Security alerts
- `dds:started` - DDS operations
- `lockup:executed` - Lockup events

## Environment Variables Reference

| Variable           | Required | Default | Description                            |
| ------------------ | -------- | ------- | -------------------------------------- |
| `NODE_ENV`         | Yes      | -       | `development`, `production`, or `test` |
| `PORT`             | No       | `3000`  | HTTP server port                       |
| `LOG_LEVEL`        | No       | `info`  | `error`, `warn`, `info`, `debug`       |
| `DATABASE_URL`     | Yes      | -       | PostgreSQL connection string           |
| `REDIS_URL`        | Yes      | -       | Redis connection string                |
| `JWT_SECRET`       | Yes      | -       | Secret for JWT signing (32+ chars)     |
| `API_KEY_SECRET`   | Yes      | -       | Secret for API key hashing             |
| `SESSION_SECRET`   | Yes      | -       | Secret for session cookies             |
| `SOCKET_IO_SECRET` | Yes      | -       | Secret for Socket.IO auth              |
| `CORS_ORIGINS`     | No       | `*`     | Comma-separated allowed origins        |

**Security Note:** Generate secrets with `openssl rand -base64 32`

## Troubleshooting

### Common Issues

**1. Tests failing with "Port already in use"**

```bash
# Clean up test containers
pnpm test:clean:force
```

**2. Database connection errors**

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check database is running
docker ps | grep postgres
```

**3. Redis connection errors**

```bash
# Restart Redis
docker-compose restart redis

# Verify Redis is accessible
redis-cli ping  # Should return "PONG"
```

**4. "Module not found" errors**

```bash
# Reinstall dependencies
pnpm install --force

# Rebuild workspace
pnpm build
```

**5. Type errors with imports**

```bash
# Run type checking
pnpm typecheck

# Rebuild contracts package
cd packages/contracts && pnpm build
```

## CI/CD Integration

### GitHub Actions

The backend is tested on every push via `.github/workflows/test.yml`:

- ✅ TypeScript type checking
- ✅ ESLint linting
- ✅ Unit & integration tests
- ✅ Coverage reporting (Codecov)

Build artifacts are generated via `.github/workflows/build.yml`:

- ✅ Docker image build
- ✅ Multi-arch support (amd64, arm64)
- ✅ Container security scanning

### Running CI Checks Locally

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test

# Build
pnpm build
```

## Production Considerations

### Before Deploying to Production

- [ ] Set strong secrets (not dev defaults)
- [ ] Configure CORS to specific origins
- [ ] Enable HTTPS (Nginx reverse proxy recommended)
- [ ] Set up log aggregation (Loki/Grafana)
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Set up database backups
- [ ] Review rate limiting settings
- [ ] Enable Helmet security headers
- [ ] Configure graceful shutdown timeouts
- [ ] Set up health check monitoring

### Security Audit

```bash
# Check for vulnerabilities
pnpm audit

# Fix auto-fixable vulnerabilities
pnpm audit fix
```

**Last audit:** January 23, 2026 - No vulnerabilities

## Contributing

1. Create feature branch from `develop`
2. Make changes and add tests
3. Ensure tests pass: `pnpm test`
4. Create PR to `develop` (1 approval required)
5. Never push directly to `develop` or `main`

## License

Private - HMCS Chippawa Internal Use Only
