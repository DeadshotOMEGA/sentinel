# Route Layer Instructions

Scope: `apps/backend/src/routes/*.ts`

## Inheritance

- Apply parent `apps/backend/AGENTS.md` and root rules.
- This file highlights route-specific constraints.

## Non-negotiable route rules

- Use direct async handlers, not middleware arrays in route definitions.
- Declare specific paths before parameterized paths.
- Use `getPrismaClient()` from `../lib/database.js`; do not import global `prisma` from `@sentinel/database`.
- Prefer repositories over direct Prisma usage.
- Return `{ status: <code> as const, body: ... }`.
- Convert repository/domain types to API response types:
  date -> ISO string, optional -> `null` where API expects nullable fields.
- Wrap repository calls in try/catch and map expected statuses:
  200/201/400/404/409/500.

## Workflow

- New endpoint: Valibot schema -> ts-rest contract -> handler -> mount -> integration tests.

## Reference

- Source file: `apps/backend/src/routes/CLAUDE.md`.
