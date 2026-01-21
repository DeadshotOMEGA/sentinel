# CLAUDE Rules: Shared Libraries

better-auth configuration, API key management, and Winston logging with correlation tracking.

---

## Scope
Applies when modifying: `apps/backend/src/lib/auth.ts`, `apps/backend/src/lib/logger.ts`

## Non-Negotiables (MUST / MUST NOT)

**Authentication Strategy**:
- MUST support 3 auth methods: JWT sessions (admin), API keys (kiosks), API keys (RFID readers)
- MUST use better-auth with Prisma adapter
- MUST set session expiry to 7 days (`expiresIn: 60 * 60 * 24 * 7`)
- MUST set API key expiry to 1 year (`expiresIn: 60 * 60 * 24 * 365`)
- MUST prefix API keys with `sk_`

**Password Requirements**:
- MUST enforce min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
- MUST use better-auth built-in bcrypt hashing
- MUST NOT store passwords in plain text

**Secrets Management**:
- MUST use 256+ bit random secrets for JWT_SECRET, API_KEY_SECRET, SESSION_SECRET
- MUST load secrets from environment variables (NEVER hardcode)
- MUST NOT commit secrets to git

**Logging**:
- MUST use Winston logger with AsyncLocalStorage for correlation IDs
- MUST include correlation ID in all log entries
- MUST use module-specific loggers (apiLogger, dbLogger, authLogger, wsLogger, serviceLogger)
- MUST NOT log passwords, secrets, or API keys

**Rate Limiting**:
- MUST apply stricter limits to login endpoints (5 attempts per 15 min)
- MUST apply general limits to API endpoints (100 requests per min)

**Security Headers**:
- MUST use Helmet for security headers
- MUST configure CORS with explicit allowed origins
- MUST set Content Security Policy (CSP)
- MUST enforce HTTPS in production

## Defaults (SHOULD)

**API Key Rotation**:
- SHOULD rotate API keys every 12 months
- SHOULD soft delete old keys (keep for audit trail)
- SHOULD follow least privilege for permissions

**Logging**:
- SHOULD use structured logging with metadata objects
- SHOULD include stack traces for errors
- SHOULD set LOG_LEVEL via environment variable

**OWASP Compliance**:
- SHOULD follow OWASP Top 10 mitigations
- SHOULD regularly audit auth events

## Workflow

**When adding new authentication**:
1. Update better-auth config in auth.ts
2. Add middleware in @apps/backend/src/middleware/auth.ts
3. Apply middleware to routes
4. Add rate limiting if needed
5. Log auth events for audit trail

**When adding new logging**:
1. Use appropriate module logger (apiLogger, dbLogger, etc.)
2. Include correlation ID from requestContext
3. Use structured metadata (objects, not strings)
4. Set appropriate log level (error, warn, info, debug)

## Quick Reference

### better-auth Configuration

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
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    apiKey({
      prefix: 'sk_',
      expiresIn: 60 * 60 * 24 * 365,  // 1 year
    }),
  ],
})
```

### API Key Creation

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

### Logging with Correlation IDs

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

### Module-Specific Loggers

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

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

// Login endpoints (strict)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 5,  // 5 attempts per IP
})
app.post('/api/auth/login', loginLimiter, loginHandler)

// API endpoints (general)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 min
  max: 100,  // 100 requests per min
  keyGenerator: (req) => req.apiKey?.id || req.ip,
})
app.use('/api/*', apiKeyAuth, apiLimiter)
```

### Security Headers

```typescript
import helmet from 'helmet'
import cors from 'cors'

app.use(helmet())
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    connectSrc: ["'self'", 'wss://'],  // Socket.IO
  },
}))
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}))
```

### Environment Variables Required

```bash
JWT_SECRET="<openssl rand -base64 32>"
API_KEY_SECRET="<openssl rand -base64 32>"
SESSION_SECRET="<openssl rand -base64 32>"
SOCKET_IO_SECRET="<openssl rand -base64 32>"
LOG_LEVEL="info"  # error, warn, info, debug
```

---

**Database Schema**: better-auth creates User, Session, Account, Verification, ApiKey tables in PostgreSQL.

**OWASP Top 10**: Mitigations implemented for broken access control, cryptographic failures, injection, security misconfiguration, ID & auth failures.

**Related**: @apps/backend/src/middleware/CLAUDE.md (middleware usage), @apps/backend/CLAUDE.md (backend overview)
