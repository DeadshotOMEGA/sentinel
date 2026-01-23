# CLAUDE Rules: Sentinel Project

RFID-based attendance tracking system for HMCS Chippawa naval reserve unit.

## Scope

Applies when editing files under: `/home/sauk/projects/sentinel/`

## Meta: Writing CLAUDE.md Files

When creating or editing `CLAUDE.md` files:

- MUST treat as instruction files (not documentation)
- MUST follow Rules Authoring Standard: @.claude/standards/rules-authoring.md
- MUST scope rules to deepest directory where always true
- Conflict resolution: Closest directory wins; MUST overrides SHOULD

## Non-Negotiables (MUST / MUST NOT)

- MUST use pnpm (NOT Bun - HeroUI incompatibility) and Node.js 24.x
- MUST use TypeScript strict mode
- MUST NOT use `any` types
- MUST NOT push directly to `develop` branch
- MUST create PR from `rebuild` → `develop` with 1 approval required
- MUST use conventional commit format (`feat:`, `fix:`, `chore:`, etc.)
- MUST follow Rules Authoring Standard for all CLAUDE.md files

## Defaults (SHOULD)

- SHOULD achieve 80%+ test coverage (Repos: 90%, Routes: 80%, Services: 85%)
- SHOULD use integration-first testing (70% integration, 15% unit, 15% E2E)
- SHOULD read relevant domain CLAUDE.md before making changes
- SHOULD use specialized agents for domain-specific work

## Workflow

- When working in backend code: Read domain CLAUDE.md first (repositories, routes, middleware, etc.)
- When creating documentation: Follow Diátaxis framework; use `docs/templates/`
- When refactoring CLAUDE.md: Extract explanations to `docs/`, keep only constraints, target 200-600 tokens

## Specialized Agents

Use proactively for:

- `database-specialist` - Prisma/Kysely optimization
- `auth-specialist` - better-auth + API key management
- `testing-specialist` - Vitest/Testcontainers/Supertest
- `api-design-specialist` - ts-rest + Express patterns
- `rfid-iot-specialist` - RFID hardware + Socket.IO

Architecture: Express + Prisma + Kysely + better-auth + ts-rest + Socket.IO
