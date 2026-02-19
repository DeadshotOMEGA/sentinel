# Prisma Schema Instructions

Scope: `packages/database/prisma/**`

## Inheritance

- Apply `packages/database/AGENTS.md` plus root rules.

## Non-negotiable schema rules

- After any `schema.prisma` edit: run `pnpm prisma generate`.
- Before commit: run `pnpm prisma validate`.
- DB naming: snake_case via `@@map`/`@map`; TS/Prisma fields stay camelCase.
- Use UUID primary keys.
- Use `@db.Timestamp(6)` timestamps.
- Define bidirectional relations.
- Add indexes for all FK columns.
- Use `onDelete: Restrict` for enum-table relations.
- Use index name format: `idx_{table}_{column}`.

## Workflow

1. Edit schema.
2. `pnpm prisma validate && pnpm prisma format`.
3. `pnpm prisma generate`.
4. Apply with `db push` (dev) or `migrate dev`.

## Reference

- Source file: `packages/database/prisma/CLAUDE.md`.
