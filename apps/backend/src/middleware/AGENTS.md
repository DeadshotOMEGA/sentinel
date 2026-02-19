# Middleware Instructions

Scope: `apps/backend/src/middleware/*.ts`

## Inheritance

- Apply parent `apps/backend/AGENTS.md` and root rules.

## Non-negotiable middleware rules

- Preserve middleware order in `app.ts`; error handler must be last.
- Use existing auth primitives: `requireAuth`, `requireUser`, `requireApiKey`, `optionalAuth`.
- Auth check order: session token first, then API key.
- Populate `req.user` (session) or `req.apiKey` (API key).
- Correlation IDs are required:
  read/generate `X-Correlation-ID`, store via AsyncLocalStorage, return header.
- Include correlation ID in error responses; sanitize details in production.
- Map Prisma errors consistently:
  P2002->409, P2003->400, P2025->404, P2014->400.
- Apply rate limits:
  auth endpoints 5/15min, general API 100/min.
- Track request metrics and normalize paths to avoid cardinality spikes.
- Log slow requests (>1s).

## Reference

- Source file: `apps/backend/src/middleware/CLAUDE.md`.
