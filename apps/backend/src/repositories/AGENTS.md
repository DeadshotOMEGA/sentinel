# Repository Layer Instructions

Scope: `apps/backend/src/repositories/**`

## Inheritance

- Apply parent `apps/backend/AGENTS.md` and root rules.

## Non-negotiable repository rules

- Constructors must accept optional `PrismaClient` for DI.
- Use `this.prisma` in all methods, including transactions and parallel branches.
- Never use global `prisma` in repositories.
- Use Prisma typed inputs (`Prisma.*CreateInput`, `Prisma.*UpdateInput`).
- Keep tests integration-first with real database/Testcontainers.
- Target 90%+ coverage and include CRUD + error path tests.
- In transactions that must fail on missing record, use `update` (not `updateMany`).

## Defaults

- Method order: constructor, find\*, create, update, delete, count.
- Use `select` to limit fields and `Promise.all` where safe.

## Reference

- Source: this `AGENTS.md`.
