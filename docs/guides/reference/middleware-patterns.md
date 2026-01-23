---
type: reference
title: Middleware Patterns
status: current
created: 2026-01-23
last_updated: 2026-01-23
---

# Middleware Patterns Reference

Code examples and implementations for middleware in the Sentinel backend.

## Middleware Stack Order

Maintain this exact order in `app.ts`:

```typescript
app.use(helmet())                    // 1. Security headers
app.use(cors())                      // 2. CORS configuration
app.use(compression())               // 3. Response compression
app.use(express.json())              // 4. JSON body parsing
app.use(express.urlencoded())        // 5. URL-encoded body parsing
app.use(cookieParser())              // 6. Cookie parsing
app.use(requestLogger)               // 7. Correlation ID + logging
app.use(metricsMiddleware)           // 8. Prometheus metrics tracking
app.use('/api', apiLimiter)          // 9. Rate limiting (API routes only)
app.use(healthRouter)                // 10. Health checks (no auth)
app.all('/api/auth/*', authHandler)  // 11. better-auth routes
createExpressEndpoints(...)          // 12. Application routes (ts-rest)
app.use(notFoundHandler)             // 13. 404 handler
app.use(errorHandler)                // 14. Error handler (MUST BE LAST)
```

## Authentication Functions

Usage patterns for authentication middleware:

```typescript
// Require auth (session OR API key)
requireAuth(true) // Returns 401 if missing
requireAuth(false) // Continues without auth (optionalAuth alias)

// Require user session only
requireUser() // Returns 401 if no session (even with API key)

// Require API key only
requireApiKey() // Returns 401 if no API key
requireApiKey(['kiosk:checkin', 'kiosk:admin']) // Returns 403 if missing scopes
```

## Error Response Classes

Standard error classes for consistent error handling:

```typescript
// 400 Bad Request
throw new ValidationError('Invalid email format')

// 404 Not Found
throw new NotFoundError('Member', memberId) // "Member with ID 'xxx' not found"

// 409 Conflict
throw new ConflictError('Member with service number already exists')

// Generic with custom code
throw new AppError('Custom error', 500, 'CUSTOM_CODE')
```

## Rate Limiter Configuration

Configure rate limiting for different endpoints:

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

## Request Logging

Implement request correlation ID tracking:

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

## Accessing Request Context

Access correlation IDs and user information from request context:

```typescript
import { requestContext } from '@/lib/logger.js'

const store = requestContext.getStore()
const correlationId = store?.correlationId
const userId = store?.userId

logger.info('Processing', { correlationId, userId })
```

## Metrics Middleware

Track all HTTP requests and custom operations:

```typescript
import { metricsMiddleware } from './middleware/metrics.js'

// Automatically tracks all HTTP requests
app.use(metricsMiddleware)

// Path normalization examples:
// /api/members/123e4567-... → /api/members/:id
// /api/badges/serial/ABC123 → /api/badges/serial/:serialNumber
// /api/members/45 → /api/members/:id
```

### Recording Custom Metrics

Record domain-specific operations:

```typescript
import {
  recordCheckin,
  recordBadgeOperation,
  recordVisitorOperation,
  recordEvent,
  recordDdsAssignment,
  recordSecurityAlert,
} from '../lib/metrics.js'

// In route handlers
recordCheckin('in', 'normal')
recordBadgeOperation('assigned')
recordVisitorOperation('signin')
recordEvent('training')
recordDdsAssignment('assigned')
recordSecurityAlert('high', 'unauthorized_access')
```

## Error Handler Integration

The error handler automatically processes all errors:

```typescript
// Error handler automatically:
// - Maps Prisma errors to HTTP codes
// - Includes correlation ID
// - Sanitizes errors in production
// - Logs all errors

app.use(errorHandler) // MUST BE LAST
```

### Prisma Error Mappings

Standard HTTP status codes for Prisma errors:

- P2002 → 409 Conflict (unique constraint)
- P2003 → 400 Bad Request (FK constraint)
- P2025 → 404 Not Found (record not found)
- P2014 → 400 Bad Request (invalid relation)

## Request Extensions

Middleware adds these properties to Express request objects for use in route handlers:

- `req.user` - Session user information
- `req.session` - Session data
- `req.apiKey` - API key details

## Response Headers

All responses include `X-Correlation-ID` for request tracing and debugging.
