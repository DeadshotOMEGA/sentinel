# Database Package Instructions

Scope: `packages/database/**`

## Inheritance

- Apply root `AGENTS.md`.
- Deeper directories (`prisma/`, `src/`) add stricter local rules.

## Non-negotiable package rules

- Use Prisma 7 with `@prisma/adapter-pg`.
- Provide `adapter` when constructing PrismaClient.
- Do not use old `datasources` Prisma-6 style config.
- Keep singleton production client pattern in `src/client.ts`.
- Tests should inject Prisma clients instead of using global singleton.
- Run `pnpm prisma generate` after schema changes.
- Keep package ESM (`"type": "module"`) and custom generated output path.
- Ensure `DATABASE_URL` is set before importing client.

## Operational defaults

- Dev: `prisma db push`; prod: `prisma migrate deploy`.
- Prefer Testcontainers for integration tests.

## Reference

- Source: this `AGENTS.md`.
