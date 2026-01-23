# CLAUDE Rules: Shared Libraries

## Scope

Applies when modifying: `apps/backend/src/lib/auth.ts`, `apps/backend/src/lib/logger.ts`, `apps/backend/src/lib/metrics.ts`

## Non-Negotiables (MUST / MUST NOT)

**Authentication**:

- MUST support 3 auth methods: JWT sessions (admin), API keys (kiosks), API keys (RFID readers)
- MUST use better-auth with Prisma adapter
- MUST set session expiry to 7 days, API key expiry to 1 year
- MUST prefix API keys with `sk_`
- MUST enforce passwords: min 12 chars, 1 uppercase/lowercase/number/special
- MUST use better-auth bcrypt hashing (never plain text)
- MUST use 256+ bit random secrets (JWT_SECRET, API_KEY_SECRET, SESSION_SECRET)
- MUST load secrets from environment (NEVER hardcode)

**Logging**:

- MUST use Winston logger with AsyncLocalStorage for correlation IDs
- MUST include correlation ID in all entries
- MUST use module-specific loggers (apiLogger, dbLogger, authLogger, wsLogger, serviceLogger)
- MUST NOT log passwords, secrets, or API keys

**Metrics**:

- MUST use prom-client for Prometheus metrics
- MUST register all metrics with global registry
- MUST include Node.js default metrics (CPU, memory, event loop)
- MUST NOT create high-cardinality metrics (use path normalization)

**Rate Limiting**:

- MUST apply stricter limits to login endpoints (5 attempts per 15 min)
- MUST apply general limits to API endpoints (100 requests per min)

**Security**:

- MUST use Helmet for security headers
- MUST configure CORS with explicit allowed origins
- MUST set Content Security Policy (CSP)
- MUST enforce HTTPS in production

## Defaults (SHOULD)

- SHOULD rotate API keys every 12 months (soft delete old keys)
- SHOULD use structured logging with metadata objects
- SHOULD include stack traces for errors
- SHOULD set LOG_LEVEL via environment variable

## Workflow

**When adding new authentication**: Update better-auth config → Add middleware → Apply to routes → Add rate limiting → Log auth events

**When adding new logging**: Use appropriate module logger → Include correlation ID → Use structured metadata → Set log level
