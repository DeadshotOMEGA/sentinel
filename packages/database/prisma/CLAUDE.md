# CLAUDE Rules: Prisma Schema

## Scope

Applies when editing files under: `packages/database/prisma/`

## Non-Negotiables (MUST / MUST NOT)

- MUST run `pnpm prisma generate` after ANY schema.prisma modification
- MUST run `pnpm prisma validate` before committing
- MUST use snake_case for table/column names via `@@map()` and `@map()`
- MUST use camelCase for Prisma/TypeScript field names
- MUST use UUID for all primary keys (NOT auto-increment)
- MUST use `@db.Timestamp(6)` for all timestamps
- MUST define bidirectional relations (parent array + child FK)
- MUST add index for all FK columns
- MUST use `onDelete: Restrict` for enum table relations
- MUST follow index naming: `idx_{table}_{column}`

## Defaults (SHOULD)

- SHOULD index foreign keys (not auto-indexed by Prisma)
- SHOULD index frequently queried columns (WHERE, JOIN, ORDER BY)
- SHOULD use composite indexes for multi-column queries
- SHOULD add indexes to enum table code/name columns

## Workflow

**When modifying schema**:

1. Edit schema.prisma
2. Run `pnpm prisma validate && pnpm prisma format`
3. Run `pnpm prisma generate`
4. Apply: `pnpm prisma db push` (dev) or `pnpm prisma migrate dev --name description`

**When adding FK relationship**:

1. Add nullable FK column to child table
2. Add relation field to child with `onDelete: Restrict`
3. Add reverse relation array to parent
4. Add index to FK column
5. Regenerate and apply

**When adding enum table**:

1. Create table with id (UUID), code, name, indexes
2. Add reverse relations to parent tables
3. Regenerate and apply
