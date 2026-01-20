# Shared Libraries Documentation

Documentation for authentication and logging utilities used throughout the backend.

---

## Authentication (`auth.ts`)

### Overview

better-auth configuration with Prisma adapter for session-based authentication.

**File**: [auth.ts](auth.ts)

---

### Configuration

```typescript
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { PrismaClient } from '@sentinel/database'

const prisma = new PrismaClient()

export const auth = betterAuth({
  // Database adapter
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,  // Admin users created manually
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7,      // 7 days
    updateAge: 60 * 60 * 24,           // Refresh every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,                  // 5 minute cache
    },
  },

  // Security options
  advanced: {
    generateId: () => crypto.randomUUID(),
    cookieSameSite: 'lax',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  // Base URL for auth endpoints
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  basePath: '/api/auth',

  // Trusted origins
  trustedOrigins: process.env.CORS_ORIGIN
    ? [process.env.CORS_ORIGIN]
    : ['http://localhost:3000', 'http://localhost:5173'],
})
```

---

### Database Schema

better-auth creates 5 tables in PostgreSQL:

#### `User` Table
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  accounts      Account[]
}
```

#### `Session` Table
```prisma
model Session {
  id        String   @id @default(uuid())
  userId    String
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### `Account` Table
```prisma
model Account {
  id                String   @id @default(uuid())
  userId            String
  accountId         String
  providerId        String
  accessToken       String?
  refreshToken      String?
  idToken           String?
  expiresAt         DateTime?
  password          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### `Verification` Table
```prisma
model Verification {
  id         String   @id @default(uuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

#### `ApiKey` Table (for kiosks)
```prisma
model ApiKey {
  id        String    @id @default(uuid())
  key       String    @unique
  name      String?
  expiresAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

---

### Type Exports

```typescript
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

**Usage**:
```typescript
import { Session, User } from '@/lib/auth.js'

function handleSession(session: Session) {
  const user: User = session.user
  console.log(user.id, user.email, user.name)
}
```

---

### API Methods

#### Verify Session

```typescript
const session = await auth.api.getSession({
  headers: req.headers as unknown as Record<string, string>,
})

if (session?.user) {
  // User authenticated
  console.log(session.user.id, session.user.email)
  console.log(session.session.id, session.session.expiresAt)
}
```

#### Create Session (Login)

```typescript
const session = await auth.api.signInEmail({
  email: 'admin@example.com',
  password: 'securepassword',
})
```

#### Destroy Session (Logout)

```typescript
await auth.api.signOut({
  headers: req.headers as unknown as Record<string, string>,
})
```

---

### Mounted Routes

better-auth automatically provides these routes when mounted at `/api/auth`:

- `POST /api/auth/sign-in/email` - Email/password login
- `POST /api/auth/sign-up/email` - User registration (can be disabled)
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/verify-email` - Email verification
- `GET /api/auth/list-sessions` - List user sessions
- `POST /api/auth/revoke-session` - Revoke session

**Mounting** ([../app.ts](../app.ts)):
```typescript
app.all('/api/auth/*', (req, res) => {
  return auth.handler(req as any)
})
```

---

### API Key Authentication

**Note**: better-auth API key plugin was not available in v1.0.0. Custom API key validation is implemented in [../middleware/auth.ts](../middleware/auth.ts).

**To Implement**:
1. Generate API keys with scopes (e.g., `kiosk:checkin`, `kiosk:admin`)
2. Store in `ApiKey` table with expiration
3. Validate in middleware by querying database
4. Check scopes for authorization

---

### Security Features

1. **Password Hashing**: Automatic bcrypt hashing (12 rounds minimum)
2. **Session Tokens**: Secure random tokens with expiration
3. **Cookie Security**: Secure cookies in production (HTTP-only, SameSite)
4. **CSRF Protection**: Built-in CSRF token validation
5. **Rate Limiting**: Should be applied to auth routes (see [../middleware/rate-limit.ts](../middleware/rate-limit.ts))

---

## Logging (`logger.ts`)

### Overview

Winston structured logging with AsyncLocalStorage for correlation ID tracking.

**File**: [logger.ts](logger.ts)

---

### Configuration

```typescript
import winston from 'winston'
import { AsyncLocalStorage } from 'async_hooks'

// Request context storage for correlation IDs
export const requestContext = new AsyncLocalStorage<{
  correlationId?: string
  userId?: string
}>()

// Main logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
      const store = requestContext.getStore()
      const correlationId = store?.correlationId
      const userId = store?.userId

      const corrIdStr = correlationId && typeof correlationId === 'string'
        ? `[${correlationId.slice(0, 8)}]`
        : ''

      const userIdStr = userId && typeof userId === 'string'
        ? `[user:${userId.slice(0, 8)}]`
        : ''

      return `${info.timestamp} ${info.level} ${corrIdStr}${userIdStr} ${info.message} ${
        info.stack || JSON.stringify(info.meta || {})
      }`
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.colorize({ all: true }),
    }),
  ],
})
```

---

### Module-Specific Loggers

```typescript
export const apiLogger = logger.child({ module: 'api' })
export const dbLogger = logger.child({ module: 'db' })
export const authLogger = logger.child({ module: 'auth' })
export const wsLogger = logger.child({ module: 'ws' })
export const serviceLogger = logger.child({ module: 'service' })
```

**Usage**:
```typescript
import { apiLogger, dbLogger } from '@/lib/logger.js'

// API logging
apiLogger.info('Request received', { path: req.path, method: req.method })

// Database logging
dbLogger.debug('Query executed', { query: 'SELECT * FROM members', duration: 45 })

// Error logging with stack trace
apiLogger.error('Failed to process request', {
  error: err.message,
  stack: err.stack,
  userId: req.user?.id,
})
```

---

### Correlation ID Tracking

**How It Works**:
1. Middleware generates or extracts correlation ID from `X-Correlation-ID` header
2. Stores ID in AsyncLocalStorage via `requestContext.run()`
3. All code within request lifecycle has access to correlation ID
4. Logger includes correlation ID in all log entries
5. Response includes `X-Correlation-ID` header

**Request Logger** ([../middleware/request-logger.ts](../middleware/request-logger.ts)):
```typescript
import { requestContext } from '@/lib/logger.js'
import { v4 as uuidv4 } from 'uuid'

export function requestLogger(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4()

  requestContext.run({ correlationId }, () => {
    res.setHeader('X-Correlation-ID', correlationId)
    apiLogger.info('Request', {
      method: req.method,
      path: req.path,
      correlationId,
    })
    next()
  })
}
```

**Accessing Context in Handlers**:
```typescript
import { requestContext } from '@/lib/logger.js'

export async function someHandler(req, res) {
  const store = requestContext.getStore()
  const correlationId = store?.correlationId
  const userId = store?.userId

  logger.info('Processing request', { correlationId, userId })
}
```

---

### Log Levels

Winston supports multiple log levels (default: `info`):

```typescript
logger.error('Critical error')    // Always logged
logger.warn('Warning message')    // Warning and above
logger.info('Info message')       // Info and above
logger.http('HTTP request')       // HTTP and above
logger.verbose('Verbose message') // Verbose and above
logger.debug('Debug message')     // Debug and above
logger.silly('Silly message')     // All messages
```

**Set via Environment Variable**:
```bash
LOG_LEVEL=debug pnpm dev
```

---

### Structured Logging

Include structured metadata in logs:

```typescript
apiLogger.info('User created', {
  userId: user.id,
  email: user.email,
  role: user.role,
  correlationId: store?.correlationId,
})

dbLogger.warn('Slow query detected', {
  query: sql,
  duration: 1200,
  threshold: 1000,
})

authLogger.error('Authentication failed', {
  reason: 'invalid_credentials',
  attempts: 3,
  ipAddress: req.ip,
  error: err.message,
})
```

**JSON Output** (for production):
```json
{
  "level": "info",
  "message": "User created",
  "timestamp": "2026-01-19T12:00:00.000Z",
  "module": "api",
  "userId": "abc123",
  "email": "user@example.com",
  "role": "admin",
  "correlationId": "a1b2c3d4-e5f6-7890"
}
```

---

### Error Logging

Include stack traces for errors:

```typescript
try {
  await riskyOperation()
} catch (error) {
  logger.error('Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    correlationId: requestContext.getStore()?.correlationId,
  })

  throw error  // Re-throw for error handler
}
```

---

### Performance Logging

Log request duration:

```typescript
const start = Date.now()

// Process request
await someOperation()

const duration = Date.now() - start

apiLogger.info('Request completed', {
  method: req.method,
  path: req.path,
  statusCode: res.statusCode,
  duration,
  correlationId: requestContext.getStore()?.correlationId,
})
```

---

## Integration with Middleware

### Authentication + Logging

Authentication middleware adds `userId` to request context:

```typescript
// In auth middleware
if (session?.user) {
  req.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    role: ((session.user as Record<string, unknown>).role as string | undefined) ?? null,
  }

  // Add user ID to request context for logging
  const store = requestContext.getStore()
  if (store) {
    store.userId = session.user.id
  }

  authLogger.debug('Session authenticated', {
    userId: session.user.id,
    sessionId: session.session.id,
  })
}
```

Now all logs within this request include both correlation ID and user ID.

---

## Best Practices

### DO

✅ Use module-specific loggers (`apiLogger`, `dbLogger`, etc.)
✅ Include correlation IDs in all logs
✅ Log structured metadata (objects, not strings)
✅ Log errors with stack traces
✅ Use appropriate log levels (error, warn, info, debug)
✅ Log request start and completion with duration
✅ Include user IDs for audit trail
✅ Set `LOG_LEVEL` environment variable

### DON'T

❌ Log sensitive data (passwords, tokens, API keys)
❌ Use string concatenation in log messages
❌ Ignore errors without logging
❌ Log excessive detail in production (use debug level)
❌ Forget to include correlation IDs
❌ Mix console.log with logger (use logger only)
❌ Log in tight loops (causes performance issues)

---

## Testing

### Mocking Logger

```typescript
import { vi } from 'vitest'
import { logger } from '@/lib/logger.js'

// Mock logger in tests
vi.spyOn(logger, 'info')
vi.spyOn(logger, 'error')

it('should log request', () => {
  handler(req, res)

  expect(logger.info).toHaveBeenCalledWith('Request', {
    method: 'GET',
    path: '/api/members',
  })
})
```

### Testing with Correlation IDs

```typescript
import { requestContext } from '@/lib/logger.js'

it('should include correlation ID in logs', () => {
  const correlationId = 'test-correlation-id'

  requestContext.run({ correlationId }, () => {
    handler(req, res)

    expect(logger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ correlationId })
    )
  })
})
```

---

## Related Documentation

- [Backend Architecture](../CLAUDE.md) - Complete backend overview
- [Middleware Documentation](../middleware/CLAUDE.md) - Authentication and request logging middleware
- [Environment Variables](../CLAUDE.md#environment-variables) - Configuration options
