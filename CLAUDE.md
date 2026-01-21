# CLAUDE Rules: Sentinel Project

RFID-based attendance tracking system for HMCS Chippawa naval reserve unit.

**Repo**: https://github.com/DeadshotOMEGA/sentinel
**Status**: Backend rebuild (Phase 2 complete, Phase 3 in progress)

## Scope
Applies when editing files under: `/home/sauk/projects/sentinel/`

## Meta: Writing CLAUDE.md Files

When creating or editing **any** `CLAUDE.md` file:
- MUST treat as **instruction file**, not documentation
- MUST follow Rules Authoring Standard: @.claude/standards/rules-authoring.md
- MUST write only actionable rules (MUST / MUST NOT / SHOULD / MAY)
- MUST scope rules to deepest directory where always true
- If unsure about scope, ask before writing

**Conflict resolution**: Closest (most specific) CLAUDE.md wins.

## Non-Negotiables (MUST / MUST NOT)

**Package Management**:
- MUST use pnpm package manager (NOT Bun - HeroUI incompatibility)
- MUST use Node.js 24.x as runtime

**Code Standards**:
- MUST use TypeScript strict mode
- MUST NOT use `any` types

**Git Workflow**:
- MUST NOT push directly to `develop` branch
- MUST create PR from `rebuild` → `develop` with 1 approval required
- MUST use conventional commit format (`feat:`, `fix:`, `chore:`, etc.)

**Documentation**:
- MUST follow Rules Authoring Standard for all CLAUDE.md files
- MUST reference @docs/CLAUDE.md for documentation navigation

## Defaults (SHOULD)

**Testing**:
- SHOULD achieve 80%+ test coverage (Repos: 90%, Routes: 80%, Services: 85%)
- SHOULD use integration-first testing strategy (70% integration, 15% unit, 15% E2E)

**Architecture**:
- SHOULD use specialized agents for domain-specific work (see Quick Reference below)
- SHOULD consult domain-specific CLAUDE.md files before making changes

## Workflow

**When working in backend code**:
- Read relevant domain CLAUDE.md first (repositories, routes, middleware, etc.)
- Follow testing standards in @apps/backend/tests/CLAUDE.md

**When working with database**:
- Consult @packages/database/CLAUDE.md for schema patterns
- Consult @packages/database/src/CLAUDE.md for query patterns

**When working with API contracts**:
- Consult @packages/contracts/CLAUDE.md for ts-rest patterns

**When creating documentation**:
- Follow Diátaxis framework (tutorial, how-to, reference, explanation)
- Use templates from @docs/templates/CLAUDE.md
- Follow file naming conventions from @docs/CLAUDE.md

**When refactoring CLAUDE.md files**:
- Extract documentation to @docs/
- Keep only constraints (MUST/MUST NOT/SHOULD)
- Aim for 200-600 tokens
- Use Rules Authoring Standard template

## Quick Reference

**Documentation Hub**: @docs/CLAUDE.md

**Architecture**: Express + Prisma + Kysely + better-auth + ts-rest + Socket.IO
- Full details: @docs/guides/reference/architecture.md

**Quick Commands**: @docs/guides/reference/commands.md
**Environment Setup**: @docs/guides/reference/environment.md

**Specialized Agents** (use proactively):
- `database-specialist` - Prisma/Kysely schema & query optimization
- `auth-specialist` - better-auth + API key management
- `testing-specialist` - Vitest/Testcontainers/Supertest
- `api-design-specialist` - ts-rest + Express patterns
- `rfid-iot-specialist` - RFID hardware + Socket.IO events

**Key Domain CLAUDE.md Files**:
- Backend Testing: @apps/backend/tests/CLAUDE.md
- Auth & Logging: @apps/backend/src/lib/CLAUDE.md
- Middleware: @apps/backend/src/middleware/CLAUDE.md
- Routes: @apps/backend/src/routes/CLAUDE.md
- Repositories: @apps/backend/src/repositories/CLAUDE.md
- Database: @packages/database/CLAUDE.md
- Database Queries: @packages/database/src/CLAUDE.md
- Contracts: @packages/contracts/CLAUDE.md
- Monorepo Rules: @.claude/rules/90_monorepo-structure.md