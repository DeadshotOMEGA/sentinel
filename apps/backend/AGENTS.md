# Backend Instructions

Scope: `apps/backend/**`

## Inheritance

- Apply root `AGENTS.md` first.
- This file captures the most-used backend constraints for Codex.
- If a deeper directory has its own `AGENTS.md`, deeper rules win.

## Non-negotiable backend rules

- Use Express + ts-rest for routes.
- Use better-auth for authentication.
- Use Winston logging with correlation IDs.
- Use Valibot schemas from `@sentinel/contracts` for validation.
- Apply Helmet, rate limiting for `/api`, and explicit CORS origin whitelist.
- Use repository pattern with dependency injection.
- Keep TypeScript strict; never introduce `any`.
- Write/maintain tests before marking a feature complete.

## Testing strategy and coverage

- Follow Trophy Model target: 70% integration, 15% unit, 15% E2E.
- Coverage targets: repositories 90%+, routes 80%+, services 85%+.
- Prefer Testcontainers + real database for database-facing tests.

## Implementation workflow defaults

- New route: schema -> contract -> handler -> integration tests.
- New repository: DI constructor -> `this.prisma` usage -> integration tests.
- Auth changes: update middleware + test session/API-key/failure flows.

## Reference

- Source: this `AGENTS.md`.
