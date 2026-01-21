# CLAUDE Rules: Middleware

Authentication, error handling, rate limiting, and request logging middleware.

---

## Scope
Applies when creating or modifying: `apps/backend/src/middleware/*.ts`

## Non-Negotiables (MUST / MUST NOT)

**Middleware Stack Order** (CRITICAL):
- MUST maintain this exact order in app.ts:
  ```typescript
  app.use(helmet())                    // 1. Security headers
  app.use(cors())                      // 2. CORS configuration
  app.use(compression())               // 3. Response compression
  app.use(express.json())              // 4. JSON body parsing
  app.use(express.urlencoded())        // 5. URL-encoded body parsing
  app.use(cookieParser())              // 6. Cookie parsing
  app.use(requestLogger)               // 7. Correlation ID + logging
  app.use('/api', apiLimiter)          // 8. Rate limiting (API routes only)
  app.use(healthRouter)                // 9. Health checks (no auth)
  app.all('/api/auth/*', authHandler)  // 10. better-auth routes
  createExpressEndpoints(...)          // 11. Application routes (ts-rest)
  app.use(notFoundHandler)             // 12. 404 handler
  app.use(errorHandler)                // 13. Error handler (MUST BE LAST)
  ```

**Authentication Middleware**:
- MUST use `requireAuth(required: boolean)` for base authentication
- MUST check session token first, then API key
- MUST set `req.user` for session auth and `req.apiKey` for API key auth
- MUST add userId to requestContext for logging when session valid

**Error Handling**:
- MUST place errorHandler as LAST middleware
- MUST map Prisma errors to HTTP status codes:
  - P2002 → 409 Conflict (unique constraint)
  - P2003 → 400 Bad Request (FK constraint)
  - P2025 → 404 Not Found (record not found)
  - P2014 → 400 Bad Request (invalid relation)
- MUST include correlation ID in error responses
- MUST sanitize error details in production

**Rate Limiting**:
- MUST apply stricter limits to auth endpoints (5 per 15 min)
- MUST apply general limits to API endpoints (100 per min)

**Request Logging**:
- MUST generate or extract correlation ID from X-Correlation-ID header
- MUST store correlation ID in AsyncLocalStorage via requestContext.run()
- MUST include X-Correlation-ID in response headers

## Defaults (SHOULD)

**Authentication**:
- SHOULD use `requireUser()` for admin-only endpoints
- SHOULD use `requireApiKey(scopes?)` for kiosk endpoints
- SHOULD use `optionalAuth` for public endpoints with personalization

**Error Handling**:
- SHOULD use custom error classes (AppError, ValidationError, NotFoundError, ConflictError)
- SHOULD log all errors with stack traces

**Rate Limiting**:
- SHOULD disable in test environments via ENABLE_RATE_LIMITING=false

## Workflow

**When adding new middleware**:
1. Create middleware function in appropriate file
2. Add to middleware stack in app.ts in correct order
3. Test with integration tests
4. Document in this file

**When adding new authentication requirement**:
1. Use existing functions: `requireAuth()`, `requireUser()`, or `requireApiKey()`
2. Apply to routes via ts-rest contracts (middleware applied globally)
3. Check `req.user` or `req.apiKey` in handlers if needed

## Quick Reference

### Authentication Functions

```typescript
// Require auth (session OR API key)
requireAuth(true)   // Returns 401 if missing
requireAuth(false)  // Continues without auth (optionalAuth alias)

// Require user session only
requireUser()  // Returns 401 if no session (even with API key)

// Require API key only
requireApiKey()  // Returns 401 if no API key
requireApiKey(['kiosk:checkin', 'kiosk:admin'])  // Returns 403 if missing scopes
```

### Error Response Classes

```typescript
// 400 Bad Request
throw new ValidationError('Invalid email format')

// 404 Not Found
throw new NotFoundError('Member', memberId)  // "Member with ID 'xxx' not found"

// 409 Conflict
throw new ConflictError('Member with service number already exists')

// Generic with custom code
throw new AppError('Custom error', 500, 'CUSTOM_CODE')
```

### Rate Limiter Configuration

```typescript
import rateLimit from 'express-rate-limit'

// API endpoints (100 req/min)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
})

// Auth endpoints (5 req/15min)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts',
})
```

### Request Logging

```typescript
import { requestContext } from '@/lib/logger.js'
import { v4 as uuidv4 } from 'uuid'

export function requestLogger(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4()

  requestContext.run({ correlationId }, () => {
    res.setHeader('X-Correlation-ID', correlationId)
    apiLogger.info('Request', { method: req.method, path: req.path, correlationId })
    next()
  })
}
```

### Accessing Request Context

```typescript
import { requestContext } from '@/lib/logger.js'

const store = requestContext.getStore()
const correlationId = store?.correlationId
const userId = store?.userId

logger.info('Processing', { correlationId, userId })
```

### Error Handler Integration

```typescript
// Error handler automatically:
// - Maps Prisma errors to HTTP codes
// - Includes correlation ID
// - Sanitizes errors in production
// - Logs all errors

app.use(errorHandler)  // MUST BE LAST
```

---

**Request Extensions**: Middleware adds `req.user`, `req.session`, `req.apiKey` for use in route handlers.

**Response Headers**: All responses include `X-Correlation-ID` for tracing.

**Related**: @apps/backend/src/lib/CLAUDE.md (auth & logging), @apps/backend/src/routes/CLAUDE.md (route usage)
