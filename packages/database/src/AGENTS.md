# Database Query Instructions

Scope: backend query patterns in repository/service code using database package patterns

## Inheritance

- Apply `packages/database/AGENTS.md` and backend scoped rules.

## Non-negotiable query rules

- Tool choice:
  Prisma for simple CRUD; Kysely for complex joins/aggregates; raw SQL COPY for bulk imports >1000 rows.
- Use `findUnique` for unique lookups.
- Use `select` to restrict returned fields in production paths.
- Handle null relations safely before property access.
- Handle Prisma codes P2002/P2003/P2025.
- Ensure indexing for FKs and high-frequency filter/sort columns.
- Use transactions for multi-step write logic.
- Use raw SQL for data migrations (separate from schema migrations).

## Defaults

- Prefer include/join strategies that reduce query count.
- Track and optimize queries slower than 100ms in dev profiling.

## Reference

- Source files: `packages/database/src/CLAUDE.md`, `docs/guides/reference/database-query-patterns.md`.
