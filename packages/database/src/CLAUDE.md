# CLAUDE Rules: Database Query Patterns

## Scope

Applies when writing database queries in: `apps/backend/src/repositories/`, `apps/backend/src/services/`

## Non-Negotiables (MUST / MUST NOT)

**Tool Selection**:

- MUST use Prisma Client for simple CRUD operations
- MUST use Kysely for complex queries with joins/aggregates
- MUST use raw SQL `COPY` for bulk imports > 1000 rows

**Prisma Requirements**:

- MUST use `findUnique` for unique lookups (NOT `findFirst`)
- MUST use `select` to limit fields in production
- MUST check for null on relations before accessing properties
- MUST handle Prisma error codes (P2002, P2003, P2025)

**Indexing**:

- MUST index all foreign keys
- MUST index frequently filtered columns (WHERE, ORDER BY)
- MUST NOT index rarely queried columns or small tables (< 1000 rows)

**Transactions**:

- MUST use transactions for multi-operation logic
- MUST use raw SQL for data migrations (separate from schema migrations)

## Defaults (SHOULD)

**Performance**:

- SHOULD use `relationLoadStrategy: 'join'` for better performance
- SHOULD use includes instead of separate queries
- SHOULD use connection pooling (10 connections per instance)
- SHOULD monitor query performance in development

**Migrations**:

- SHOULD backup before production migrations
- SHOULD test on staging first
- SHOULD never edit applied migrations

## Workflow

**When choosing query tool**:

1. Simple CRUD? → Use Prisma Client
2. Complex joins/aggregates? → Use Kysely
3. Bulk import > 1000 rows? → Use raw SQL COPY
4. Need < 100ms query? → Use Kysely

**When optimizing query**:

1. Enable Prisma query logging
2. Identify slow queries (> 100ms)
3. Add indexes for WHERE/JOIN/ORDER BY columns
4. Use `select` to limit fields
5. Use Kysely for complex queries

## Reference

See `/docs/guides/reference/database-query-patterns.md` for code examples:

- Prisma best practices with before/after examples
- Kysely complex query patterns
- Bulk import and connection pooling configuration
- Query logging setup for development
