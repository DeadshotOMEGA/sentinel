# CLAUDE Rules: Sentinel Backend

## Scope

Applies when editing files under: `apps/backend/`

## Non-Negotiables (MUST / MUST NOT)

**Architecture**:

- MUST use Express + ts-rest for routes
- MUST use better-auth for authentication
- MUST use Winston logger with correlation IDs
- MUST follow middleware order in `app.ts` (see Quick Reference below)

**Testing**:

- MUST achieve 80%+ test coverage (repositories: 90%, routes: 80%, services: 85%)
- MUST use integration-first testing strategy (70% integration, 15% unit, 15% E2E)
- MUST use Testcontainers for database tests
- MUST NOT mock database operations

**Type Safety**:

- MUST use TypeScript strict mode
- MUST NOT use `any` types
- MUST use Valibot schemas from `@sentinel/contracts` for validation

**Security**:

- MUST use Helmet for security headers
- MUST apply rate limiting to all `/api` routes
- MUST validate all user input via Valibot schemas
- MUST use CORS with explicit origin whitelist

## Defaults (SHOULD)

**Code Organization**:

- SHOULD consult domain-specific CLAUDE.md before making changes
- SHOULD follow repository pattern for data access (see [src/repositories/CLAUDE.md](src/repositories/CLAUDE.md))
- SHOULD use ts-rest contracts from `@sentinel/contracts`
- SHOULD use dependency injection in repositories

**Testing**:

- SHOULD write tests before marking features complete
- SHOULD test all error paths (4xx and 5xx status codes)
- SHOULD use factory functions for test data (NOT fixtures)
- SHOULD reset database between tests

**Logging**:

- SHOULD use module-specific loggers (`apiLogger`, `dbLogger`, etc.)
- SHOULD include correlation IDs in all logs
- SHOULD log structured metadata (objects, not strings)

## Workflow

**When adding new route**:

1. Define Valibot schema in `@sentinel/contracts`
2. Create ts-rest contract in `@sentinel/contracts`
3. Implement route in `src/routes/`
4. Add integration tests with Supertest
5. Verify middleware order applies correctly
6. See: [src/routes/CLAUDE.md](src/routes/CLAUDE.md)

**When adding new repository**:

1. Create repository class with dependency injection
2. Use `this.prisma` in ALL methods (never global `prisma`)
3. Write integration tests with Testcontainers
4. Verify 90%+ coverage
5. See: [src/repositories/CLAUDE.md](src/repositories/CLAUDE.md)

**When modifying authentication**:

1. Consult [src/lib/CLAUDE.md](src/lib/CLAUDE.md) for better-auth patterns
2. Update auth middleware if needed
3. Test all auth flows (session, API key, failure cases)
4. See: [src/middleware/CLAUDE.md](src/middleware/CLAUDE.md)

**When debugging**:

- Check correlation IDs in logs for request tracing
- Review middleware execution order in `app.ts`
- Verify error handler is last in middleware stack
- See: [Troubleshooting](#troubleshooting-quick-reference)

## Quick Reference

**Architecture Stack**:

| Component  | Technology                          |
| ---------- | ----------------------------------- |
| Runtime    | Node.js 22.21.1 (NOT Bun)           |
| Framework  | Express + ts-rest                   |
| Database   | Prisma 7 + Kysely                   |
| Auth       | better-auth + API keys              |
| Testing    | Vitest + Testcontainers + Supertest |
| Validation | Valibot                             |
| Real-time  | Socket.IO                           |
| Logging    | Winston + AsyncLocalStorage         |

**Middleware Order** (from `app.ts`):

```typescript
app.use(helmet())                    // 1. Security headers
app.use(cors())                      // 2. CORS
app.use(compression())               // 3. Response compression
app.use(express.json())              // 4. JSON parsing
app.use(express.urlencoded())        // 5. URL-encoded parsing
app.use(cookieParser())              // 6. Cookie parsing
app.use(requestLogger)               // 7. Correlation IDs + logging
app.use('/api', apiLimiter)          // 8. Rate limiting
app.use(healthRouter)                // 9. Health checks
app.all('/api/auth/*', authHandler)  // 10. better-auth routes
createExpressEndpoints(...)          // 11. Application routes (ts-rest)
app.use(notFoundHandler)             // 12. 404 handler
app.use(errorHandler)                // 13. Error handler (MUST BE LAST)
```

**Domain-Specific Documentation**:

- [Testing Standards](tests/CLAUDE.md) - Integration testing with Testcontainers
- [Repository Layer](src/repositories/CLAUDE.md) - Data access patterns
- [Routes](src/routes/CLAUDE.md) - ts-rest route implementation
- [Middleware](src/middleware/CLAUDE.md) - Auth, logging, error handling
- [Auth & Logging](src/lib/CLAUDE.md) - better-auth + Winston configuration

**Cross-Package Documentation**:

- [Database Package](../../packages/database/CLAUDE.md) - Prisma 7 configuration
- [Contracts Package](../../packages/contracts/CLAUDE.md) - Valibot schemas + ts-rest
- [Root CLAUDE.md](../../CLAUDE.md) - Project-wide rules

**Quick Commands**:

```bash
# Development
pnpm dev                              # Start dev server with hot reload

# Testing
pnpm test                             # Run all tests
pnpm test:watch                       # Watch mode (TDD)
pnpm test:coverage                    # Generate coverage report
pnpm test member-repository.test.ts  # Run specific test

# Building
pnpm build                            # Build for production
pnpm typecheck                        # TypeScript validation

# Database
pnpm prisma generate                  # Regenerate Prisma client
pnpm prisma studio                    # Database GUI
```

**Project Structure**:

```
apps/backend/
├── src/
│   ├── app.ts                   # Express app + middleware config
│   ├── lib/                     # Auth + logging → See src/lib/CLAUDE.md
│   ├── middleware/              # Auth, errors, rate limiting → See src/middleware/CLAUDE.md
│   ├── routes/                  # ts-rest routes → See src/routes/CLAUDE.md
│   └── repositories/            # Data access → See src/repositories/CLAUDE.md
└── tests/                       # Integration tests → See tests/CLAUDE.md
```

**Test Coverage Targets**:

| Layer        | Target | Enforcement       |
| ------------ | ------ | ----------------- |
| Repositories | 90%+   | CI fails if below |
| Routes       | 80%+   | CI fails if below |
| Services     | 85%+   | CI fails if below |
| Overall      | 80%+   | CI fails if below |

## Troubleshooting Quick Reference

| Issue                                            | Likely Cause                                   | Fix                                                 |
| ------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------- |
| Test fails with "password authentication failed" | Using global `prisma` instead of `this.prisma` | Replace `prisma.` with `this.prisma.` in repository |
| Route not found (404)                            | Middleware order incorrect                     | Ensure ts-rest routes before 404 handler            |
| CORS error in browser                            | Missing origin in whitelist                    | Add origin to CORS config in `app.ts`               |
| Rate limit hit during development                | Too many requests                              | Set `ENABLE_RATE_LIMITING=false` in `.env.local`    |
| TypeScript error on `@sentinel/database`         | Package not built                              | Run `pnpm build` in database package                |
| Schema changes not reflected                     | Prisma client not regenerated                  | Run `pnpm prisma generate`                          |

**See Also**:

- [Repository Troubleshooting](../../docs/guides/reference/troubleshooting-repositories.md)
- [Architecture Reference](../../docs/guides/reference/architecture.md)
- [Environment Variables](../../docs/guides/reference/environment.md)
- [Commands Reference](../../docs/guides/reference/commands.md)

**Environment Variables**:

```bash
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/sentinel"
JWT_SECRET="<random-256-bit-string>"
API_KEY_SECRET="<random-256-bit-string>"

# Optional
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_RATE_LIMITING=true
```

**Authentication Methods**:

| Client Type     | Method       | Details                      |
| --------------- | ------------ | ---------------------------- |
| Admin Web Panel | JWT Sessions | Email/password, 7-day expiry |
| Kiosk Displays  | API Keys     | Long-lived, rotatable        |
| RFID Readers    | API Keys     | Machine-to-machine           |

**Status**: Phase 2 Complete (Infrastructure + Core Routes)
**Coverage**: ~88% overall
**Next**: Phase 3 (Complete route implementation)
