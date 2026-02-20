# Backend Testing Instructions

Scope: `apps/backend/tests/**`

## Inheritance

- Apply parent `apps/backend/AGENTS.md` and root rules.

## Non-negotiable testing rules

- Follow Trophy Model ratio target: 70/15/15 (integration/unit/E2E).
- Use Testcontainers with real PostgreSQL for integration tests.
- `vitest.config.ts` should keep `fileParallelism: false` for Testcontainers stability.
- Repository tests must inject Prisma client and verify `this.prisma` usage patterns.
- Do not use bare/global `prisma` in repository test flows.
- Route tests must use Supertest against the full Express app.
- Validate route status behavior including 200, 201, 400, 401, 403, 404, 500.
- Coverage targets: repositories 90%+, routes 80%+, services 85%+.

## Reference

- Source: this `AGENTS.md`.
