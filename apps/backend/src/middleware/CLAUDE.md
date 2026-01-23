# CLAUDE Rules: Middleware

## Scope

Applies when creating or modifying: `apps/backend/src/middleware/*.ts`

## Non-Negotiables (MUST / MUST NOT)

- MUST maintain middleware stack order in app.ts (see middleware-patterns reference)
- MUST use `requireAuth(required: boolean)` for base authentication
- MUST check session token first, then API key
- MUST set `req.user` for session auth and `req.apiKey` for API key auth
- MUST add userId to requestContext for logging when session valid
- MUST place errorHandler as LAST middleware in stack
- MUST map Prisma errors to HTTP status codes (P2002 → 409, P2003 → 400, P2025 → 404, P2014 → 400)
- MUST include correlation ID in error responses
- MUST sanitize error details in production
- MUST apply stricter limits to auth endpoints (5 per 15 min)
- MUST apply general limits to API endpoints (100 per min)
- MUST generate or extract correlation ID from X-Correlation-ID header
- MUST store correlation ID in AsyncLocalStorage via requestContext.run()
- MUST include X-Correlation-ID in response headers
- MUST track all HTTP requests (method, path, status, duration)
- MUST normalize paths to prevent metric explosion (UUIDs → :id)
- MUST track active connections with proper cleanup
- MUST log slow requests (> 1 second)

## Defaults (SHOULD)

- SHOULD use `requireUser()` for admin-only endpoints
- SHOULD use `requireApiKey(scopes?)` for kiosk endpoints
- SHOULD use `optionalAuth` for public endpoints with personalization
- SHOULD use custom error classes (AppError, ValidationError, NotFoundError, ConflictError)
- SHOULD log all errors with stack traces
- SHOULD disable rate limiting in test environments via ENABLE_RATE_LIMITING=false

## Workflow

**When adding new middleware**:

1. Create middleware function in appropriate file
2. Add to middleware stack in app.ts in correct order
3. Test with integration tests

**When adding new authentication requirement**:

1. Use existing functions: `requireAuth()`, `requireUser()`, or `requireApiKey()`
2. Apply to routes via ts-rest contracts
3. Check `req.user` or `req.apiKey` in handlers if needed

## Reference

See `/docs/guides/reference/middleware-patterns.md` for code examples and implementations.
