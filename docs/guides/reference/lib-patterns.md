---
type: reference
title: Shared Libraries Patterns
status: current
created: 2026-01-23
last_updated: 2026-01-23
---

# Shared Libraries Patterns

Code patterns for `apps/backend/src/lib/` modules: authentication, logging, and metrics.

## better-auth Configuration

Configure better-auth with Prisma adapter for all authentication methods:

```typescript
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { apiKey } from 'better-auth/plugins'

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    apiKey({
      prefix: 'sk_',
      expiresIn: 60 * 60 * 24 * 365, // 1 year
    }),
  ],
})
```

## API Key Creation

Create API keys with 32-byte randomness, prefixed with `sk_`:

```typescript
const rawKey = crypto.randomBytes(32).toString('base64url')
const fullKey = `sk_${rawKey}`
const apiKey = await auth.api.createApiKey({
  key: fullKey,
  name: params.name,
  permissions: params.permissions,
})
// ⚠️ Return key ONCE to user (never stored plain text)
```

## Logging with Correlation IDs

Use AsyncLocalStorage context to retrieve correlation ID from request:

```typescript
import { apiLogger, requestContext } from '@/lib/logger.js'

export async function handler(req, res) {
  const store = requestContext.getStore()
  const correlationId = store?.correlationId

  apiLogger.info('Processing request', {
    correlationId,
    userId: store?.userId,
    path: req.path,
  })
}
```

## Module-Specific Loggers

Import and use specialized loggers for different domains:

```typescript
import { apiLogger, dbLogger, authLogger, wsLogger, serviceLogger } from '@/lib/logger.js'

// API logging
apiLogger.info('Request received', { method: req.method, path: req.path })

// Database logging
dbLogger.debug('Query executed', { query: 'SELECT * FROM members', duration: 45 })

// Auth logging
authLogger.error('Authentication failed', { reason: 'invalid_credentials', attempts: 3 })

// WebSocket logging
wsLogger.info('Client connected', { socketId: socket.id })

// Service logging
serviceLogger.warn('Slow operation detected', { operation: 'processCheckin', duration: 1200 })
```

## Rate Limiting

Apply rate limiting with stricter rules for login endpoints:

```typescript
import rateLimit from 'express-rate-limit'

// Login endpoints (strict)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // 5 attempts per IP
})
app.post('/api/auth/login', loginLimiter, loginHandler)

// API endpoints (general)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 100, // 100 requests per min
  keyGenerator: (req) => req.apiKey?.id || req.ip,
})
app.use('/api/*', apiKeyAuth, apiLimiter)
```

## Security Headers

Configure Helmet for CSP and CORS for explicit origin whitelist:

```typescript
import helmet from 'helmet'
import cors from 'cors'

app.use(helmet())
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'wss://'], // Socket.IO
    },
  })
)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
)
```

## Prometheus Metrics

Record HTTP, database, auth, and business metrics:

```typescript
import {
  register,
  recordHttpRequest,
  recordDatabaseQuery,
  recordAuthAttempt,
  recordCheckin,
  recordBadgeOperation,
  recordVisitorOperation,
  recordEvent,
  recordDdsAssignment,
  recordSecurityAlert,
} from '../lib/metrics.js'

// Serve metrics endpoint (in health.ts)
healthRouter.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

// Record business metrics
recordCheckin('in', 'normal') // Check-in with direction and type
recordBadgeOperation('assigned') // Badge operation
recordVisitorOperation('signin') // Visitor sign-in
recordEvent('training') // Event creation
recordDdsAssignment('assigned') // DDS assignment
recordSecurityAlert('high', 'unauthorized_access') // Security alert

// Record auth attempt
recordAuthAttempt('success', 'session') // or 'failure', 'apikey'

// Record database query
const start = Date.now()
const result = await prisma.member.findMany()
recordDatabaseQuery('findMany', (Date.now() - start) / 1000, true)
```

### Available Metrics

- HTTP: `http_requests_total`, `http_request_duration_seconds`, `http_active_connections`
- Database: `database_query_duration_seconds`, `database_queries_total`, `database_pool_size`
- Auth: `auth_attempts_total`, `auth_active_sessions`
- Business: `checkins_total`, `badge_operations_total`, `visitor_operations_total`, `events_total`, `dds_assignments_total`, `security_alerts_total`
- Node.js defaults: CPU, memory, event loop, GC stats (auto-collected)

## Environment Variables Required

Generate secrets with: `openssl rand -base64 32`

```bash
JWT_SECRET="<openssl rand -base64 32>"
API_KEY_SECRET="<openssl rand -base64 32>"
SESSION_SECRET="<openssl rand -base64 32>"
SOCKET_IO_SECRET="<openssl rand -base64 32>"
LOG_LEVEL="info"  # error, warn, info, debug
```

## Secrets & OWASP Compliance

- better-auth creates User, Session, Account, Verification, ApiKey tables in PostgreSQL
- Mitigations implemented for OWASP Top 10: broken access control, cryptographic failures, injection, security misconfiguration, ID & auth failures
