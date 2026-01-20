# Middleware Documentation

Comprehensive guide to the Sentinel backend middleware stack.

---

## Middleware Stack Order

Middleware executes in the order configured in [../app.ts](../app.ts). **Order matters** - especially for authentication, logging, and error handling.

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

---

## Authentication Middleware

**File**: [auth.ts](auth.ts)

### Overview

Dual authentication system supporting **session-based** (web app) and **API key** (kiosks) authentication.

### Middleware Functions

#### `requireAuth(required: boolean)`

Base authentication middleware. Checks for session or API key authentication.

**Parameters**:
- `required` (boolean) - If true, returns 401 on missing/invalid auth. If false, continues without auth.

**Authentication Order**:
1. Check for session token (cookie or Bearer token in Authorization header)
2. Validate session via `better-auth.api.getSession()`
3. If session valid, set `req.user` and `req.session`
4. If no session, check for API key (X-API-Key header or Bearer token starting with `sk_`)
5. Validate API key (currently stubbed - to be implemented)
6. If API key valid, set `req.apiKey`
7. If neither valid and `required=true`, return 401

**Usage**:
```typescript
// Require authentication (401 if missing)
router.get('/protected', requireAuth(true), handler)

// Optional authentication (continues without)
router.get('/public', requireAuth(false), handler)
```

**Request Extensions**:
```typescript
req.user = {
  id: string
  email: string
  name: string | null
  role: string | null
}

req.session = {
  id: string
  expiresAt: Date
}

req.apiKey = {
  id: string
  name: string | null | undefined
  scopes?: string[]
}
```

---

#### `requireUser()`

Requires **user session authentication only**. API keys are not permitted.

**Use Cases**:
- Admin-only endpoints (dashboard, user management)
- Operations requiring audit trail with user identity
- Endpoints that modify sensitive data

**Usage**:
```typescript
router.post('/admin/settings', requireUser(), handler)
```

**Returns**: 401 if no user session, even if API key is present.

---

#### `requireApiKey(scopes?: string[])`

Requires **API key authentication only**. User sessions are not permitted.

**Parameters**:
- `scopes` (optional) - Array of required scopes. If provided, API key must have at least one matching scope.

**Use Cases**:
- Kiosk endpoints (badge scans, offline sync)
- Automated systems (integrations, cron jobs)
- Endpoints that don't need user identity

**Usage**:
```typescript
// Any valid API key
router.post('/kiosk/checkin', requireApiKey(), handler)

// API key must have 'kiosk:checkin' OR 'kiosk:admin' scope
router.post('/kiosk/checkin', requireApiKey(['kiosk:checkin', 'kiosk:admin']), handler)
```

**Returns**:
- 401 if no API key
- 403 if API key missing required scopes

---

#### `optionalAuth`

Alias for `requireAuth(false)`. Adds authentication data if present but doesn't require it.

**Use Cases**:
- Public endpoints that customize response based on auth status
- Endpoints with optional rate limiting based on authentication

**Usage**:
```typescript
router.get('/public/data', optionalAuth, (req, res) => {
  if (req.user) {
    // Return personalized data
  } else {
    // Return public data
  }
})
```

---

### Request Context

Authentication middleware integrates with the logging system via **AsyncLocalStorage**.

When authentication succeeds:
```typescript
const store = requestContext.getStore()
if (store) {
  store.userId = session.user.id
}
```

This enables correlation of logs with user identity across the entire request lifecycle.

---

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required. Provide session token or API key."
}
```

#### 403 Forbidden (scope mismatch)
```json
{
  "error": "Forbidden",
  "message": "API key does not have required scopes: kiosk:admin"
}
```

---

## Error Handling Middleware

**File**: [error-handler.ts](error-handler.ts)

### Custom Error Classes

#### `AppError`
Base error class with status code and error code.

```typescript
throw new AppError(
  'Resource not found',
  404,
  'RESOURCE_NOT_FOUND'
)
```

#### `ValidationError`
400 Bad Request - Input validation failures.

```typescript
throw new ValidationError('Invalid email format')
```

#### `NotFoundError`
404 Not Found - Resource doesn't exist.

```typescript
throw new NotFoundError('Member', memberId)
// "Member with ID '123' not found"
```

#### `ConflictError`
409 Conflict - Duplicate or constraint violation.

```typescript
throw new ConflictError('Member with service number already exists')
```

---

### Prisma Error Mapping

Automatically maps Prisma errors to HTTP status codes:

| Prisma Code | HTTP Status | Description |
|-------------|-------------|-------------|
| `P2002` | 409 Conflict | Unique constraint violation |
| `P2003` | 400 Bad Request | Foreign key constraint violation |
| `P2025` | 404 Not Found | Record not found |
| `P2014` | 400 Bad Request | Invalid relation reference |

**Example**:
```typescript
// Throws Prisma P2002 error (unique constraint)
await prisma.member.create({
  data: { serviceNumber: 'SN123' } // Duplicate
})

// Automatically converted to:
// 409 Conflict: "Unique constraint failed on the fields: (serviceNumber)"
```

---

### Error Handler Function

**Usage**: Must be the **last** middleware in the stack.

```typescript
app.use(errorHandler)
```

**Response Format**:
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Database connection failed",
  "correlationId": "a1b2c3d4"
}
```

**Error Sanitization**:
- Production: Detailed errors hidden, generic messages returned
- Development: Full error details and stack traces included
- Always includes correlation ID for debugging

---

### Not Found Handler

**Usage**: Must be **after** all routes but **before** error handler.

```typescript
app.use(notFoundHandler)
```

**Response**:
```json
{
  "error": "NOT_FOUND",
  "message": "Cannot GET /api/invalid-route"
}
```

---

## Rate Limiting Middleware

**File**: [rate-limit.ts](rate-limit.ts)

### Configuration

Three rate limiters with different limits:

#### `apiLimiter`
Applied to all `/api` routes.

```typescript
{
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests from this IP'
}
```

#### `authLimiter`
Applied to authentication endpoints (stricter limits).

```typescript
{
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 requests per window
  message: 'Too many login attempts'
}
```

#### `publicLimiter`
Applied to public endpoints (more lenient).

```typescript
{
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,                   // 300 requests per window
  message: 'Too many requests'
}
```

---

### Usage

```typescript
// Apply to all API routes
app.use('/api', apiLimiter)

// Apply to specific routes
router.post('/auth/login', authLimiter, handler)
```

---

### Response Headers

Rate limit information included in all responses:

```http
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1705600000
```

---

### Disabling Rate Limiting

Set environment variable:
```bash
ENABLE_RATE_LIMITING=false
```

Useful for:
- Development environments
- Testing (prevents test failures from rate limiting)
- Load testing

---

## Request Logging Middleware

**File**: [request-logger.ts](request-logger.ts)

### Overview

Logs all incoming requests with correlation IDs for end-to-end tracing.

### Correlation ID Generation

1. Check for `X-Correlation-ID` header in request
2. If present, use that ID
3. If missing, generate new UUID
4. Store in **AsyncLocalStorage** for access across async operations
5. Include in response header: `X-Correlation-ID: <id>`
6. Log all requests with correlation ID

---

### Usage

Automatically applied to all requests:

```typescript
app.use(requestLogger)
```

No configuration required.

---

### Log Output

**Request**:
```json
{
  "level": "info",
  "message": "Request",
  "method": "GET",
  "path": "/api/members/123",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-01-19T12:00:00.000Z"
}
```

**Response**:
```json
{
  "level": "info",
  "message": "Response",
  "method": "GET",
  "path": "/api/members/123",
  "statusCode": 200,
  "duration": 45,
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-01-19T12:00:00.045Z"
}
```

---

### Accessing Correlation ID

In route handlers or services:

```typescript
import { requestContext } from '@/lib/logger.js'

const store = requestContext.getStore()
const correlationId = store?.correlationId

logger.info('Processing request', { correlationId, userId: store?.userId })
```

---

## Best Practices

### 1. Middleware Order

Always maintain this order:
1. Security (helmet)
2. CORS
3. Body parsing
4. Request logging
5. Rate limiting
6. Authentication (if using middleware directly)
7. Routes
8. 404 handler
9. Error handler (last)

### 2. Error Handling

**DO**:
- Use custom error classes (`ValidationError`, `NotFoundError`, etc.)
- Include correlation IDs in error responses
- Sanitize errors in production
- Log all errors with stack traces

**DON'T**:
- Expose internal error details to clients in production
- Catch errors without re-throwing or handling
- Use generic `Error` class for application errors

### 3. Authentication

**DO**:
- Use `requireUser()` for admin-only endpoints
- Use `requireApiKey()` for kiosk endpoints
- Use `optionalAuth` for public endpoints with personalization
- Check `req.user` or `req.apiKey` in handlers to determine auth type

**DON'T**:
- Mix user and API key authentication in same endpoint (use separate endpoints)
- Skip authentication on sensitive operations
- Store sensitive data in API key scopes

### 4. Rate Limiting

**DO**:
- Use stricter limits on authentication endpoints
- Disable in test environments
- Monitor rate limit headers in production
- Adjust limits based on actual usage patterns

**DON'T**:
- Apply same limits to all endpoints
- Set limits too low (causes legitimate user frustration)
- Forget to expose rate limit headers

---

## Testing Middleware

### Unit Tests

Test middleware in isolation:

```typescript
import { requireAuth } from '@/middleware/auth.js'

it('should return 401 when no auth provided', async () => {
  const req = mockRequest()
  const res = mockResponse()
  const next = vi.fn()

  await requireAuth(true)(req, res, next)

  expect(res.status).toHaveBeenCalledWith(401)
  expect(next).not.toHaveBeenCalled()
})
```

### Integration Tests

Test middleware with full Express app:

```typescript
import request from 'supertest'
import { app } from '@/app.js'

it('should return 429 when rate limit exceeded', async () => {
  // Send 101 requests (exceeds limit of 100)
  for (let i = 0; i < 101; i++) {
    await request(app).get('/api/members')
  }

  const response = await request(app).get('/api/members')
  expect(response.status).toBe(429)
})
```

---

## Related Documentation

- [Authentication Library](../lib/CLAUDE.md#authentication) - better-auth configuration
- [Logging Library](../lib/CLAUDE.md#logging) - Winston setup and usage
- [Backend Architecture](../CLAUDE.md) - Complete backend overview
- [Route Implementation](../routes/CLAUDE.md) - Using middleware in routes
