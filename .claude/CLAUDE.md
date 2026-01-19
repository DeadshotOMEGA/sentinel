# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

### Sentinel - RFID Attendance Tracking System

An RFID-based attendance tracking system for HMCS Chippawa naval reserve unit.

**Status**: Rebuild in progress - setting up new backend architecture

### Architecture

**Monorepo Structure**: Backend + Frontend together (pnpm workspaces)

#### Backend Stack (Planned)
- **Runtime**: Node.js 22.21.1 (via pnpm - NOT Bun due to HeroUI compatibility)
- **Framework**: Express.js on Node
- **Database**: PostgreSQL
- **ORM**: Prisma (schema management) + Kysely (performance-critical queries)
- **Auth**: better-auth (JWT sessions, API keys for kiosks/displays)
- **Real-time**: Socket.IO (attendance events, kiosk updates)
- **Validation**: ts-rest + Valibot (type-safe API contracts)
- **Testing**: Vitest + Testcontainers + Supertest

#### Frontend Stack (TBD)
- To be determined (avoiding HeroUI)

### Key Features

1. **RFID Check-in/Check-out** - Hardware integration with RFID readers
2. **Real-time Updates** - Socket.IO for live attendance boards
3. **Kiosk Mode** - Offline-capable displays with API key auth
4. **Admin Dashboard** - Attendance management, reporting, CSV imports
5. **Multi-client Architecture**:
   - Web admin panel
   - Kiosk display
   - RFID reader clients

## Research Documentation

**CRITICAL**: Before making architectural decisions, consult the research docs in `docs/`:

- [docs/00-EXECUTIVE-SUMMARY.md](../docs/00-EXECUTIVE-SUMMARY.md) — Tech stack recommendations & priorities
- [docs/01-current-backend-analysis.md](../docs/01-current-backend-analysis.md) — Original backend analysis
- [docs/02-framework-comparison.md](../docs/02-framework-comparison.md) — Framework benchmarks & selection
- [docs/03-orm-database-comparison.md](../docs/03-orm-database-comparison.md) — ORM performance data & hybrid approach
- [docs/04-authentication-solutions.md](../docs/04-authentication-solutions.md) — better-auth rationale & migration plan
- [docs/05-realtime-communication.md](../docs/05-realtime-communication.md) — Socket.IO patterns & room architecture
- [docs/06-validation-type-safety.md](../docs/06-validation-type-safety.md) — ts-rest + Valibot migration strategy
- [docs/07-testing-strategy.md](../docs/07-testing-strategy.md) — Integration-first testing approach

**Implementation Priorities** (from Executive Summary):
1. **Phase 1**: Testing Foundation (Weeks 1-2) - Testcontainers + Supertest
2. **Phase 2**: Authentication Hardening (Week 3) - better-auth migration
3. **Phase 3**: Validation & Type Safety (Weeks 4-6) - ts-rest + Valibot
4. **Phase 4**: ORM Optimization (Weeks 7-8) - Prisma+Kysely hybrid if needed

## Common Commands

```bash
# Package management (use pnpm, NOT bun)
pnpm install                  # Install all dependencies
pnpm add <package>            # Add dependency
pnpm add -D <package>         # Add dev dependency
pnpm --filter <workspace>     # Run command in specific workspace

# Development
pnpm dev                      # Start dev server
pnpm build                    # Build for production
pnpm test                     # Run test suite
pnpm test:coverage            # Run tests with coverage

# Database (Prisma)
pnpm prisma generate          # Generate Prisma client
pnpm prisma migrate dev       # Run migrations in dev
pnpm prisma studio            # Open Prisma Studio

# Docker (PostgreSQL, Redis, etc.)
docker-compose up -d          # Start services
docker-compose down           # Stop services
docker-compose logs -f        # View logs

# GitHub
gh pr create                  # Create pull request
gh issue list                 # List issues
```

## Environment

Credentials stored in `.env.local` (gitignored):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing key
- `API_KEY_SECRET` - API key encryption key
- `SOCKET_IO_SECRET` - Socket.IO session secret
- `REDIS_URL` - Redis connection (if needed for sessions/cache)

## WSL Tools Inventory

### Package Managers
| Tool | Version | Notes |
|------|---------|-------|
| pnpm | 10.26.2 | **Preferred** (via Volta) |
| npm | 10.9.4 | via Volta |
| yarn | - | via Volta |

**Note**: `bun` is **NOT installed** intentionally. Use `pnpm` instead.

### Languages & Runtimes
| Tool | Version |
|------|---------|
| Node.js | 22.21.1 (via Volta) |
| Python | 3.12.3 |
| Rust | 1.92.0 |

### Containers
| Tool | Version |
|------|---------|
| Docker | 29.1.3 |
| Docker Compose | 2.40.3 |
| kubectl | 1.34.1 |

### CLI Tools
| Tool | Version | Purpose |
|------|---------|---------|
| gh | 2.74.0 | GitHub CLI |
| jq | 1.7 | JSON processing |
| rg (ripgrep) | 14.1.0 | Fast search |
| fd | 9.0.0 | Fast file finding |
| sg (ast-grep) | 0.40.3 | Structural code search |
| dust | 1.1.1 | Disk usage analyzer |
| hyperfine | 1.20.0 | Benchmarking |
| curl/wget | - | HTTP clients |
| tmux | - | Terminal multiplexer |
| make | - | Build automation |

### Editors
- vim
- nano

### Shell
- bash (default)

## Custom Agents

Sentinel has specialized agents in [.claude/agents/](.claude/agents/):

- **database-specialist** - Prisma/Kysely expert for schema design & query optimization
- **auth-specialist** - better-auth implementation & API key management
- **testing-specialist** - Vitest/Testcontainers/Supertest integration testing
- **api-design-specialist** - ts-rest + Express patterns & OpenAPI docs
- **rfid-iot-specialist** - RFID hardware integration & Socket.IO events

Use these agents proactively when working in their domains.

## Project Rules

See [.claude/rules/](.claude/rules/) for:
- `10_testing-standards.md` - Integration-first testing, 90% coverage targets
- `20_database-patterns.md` - Prisma+Kysely hybrid, migration workflows
- `30_auth-security.md` - better-auth patterns, API key rotation
- `90_monorepo-structure.md` - pnpm workspaces, import conventions

## Development Workflow

### Testing Philosophy
- **70% Integration Tests** (Testcontainers for DB, Supertest for routes)
- **15% Unit Tests** (Business logic, utilities)
- **15% E2E Tests** (Critical user flows)

**Coverage Targets**:
- Repositories: 90%
- Routes: 80%
- Business logic: 85%

### Code Quality
- TypeScript strict mode (NO `any` types)
- ESLint + Prettier
- Pre-commit hooks (lint, type-check, test)
- 100% type-safe API contracts with ts-rest

### Git Workflow

**Repository**: https://github.com/DeadshotOMEGA/sentinel

**Branch Structure**:
- `main` - Production branch
- `develop` - Integration branch 🔒 **PROTECTED** (PR required, 1 approval)
- `rebuild` - Current rebuild working branch (you are here)

**CRITICAL - Branch Protection Rules**:

⚠️ **NEVER push directly to `develop` branch** ⚠️

The `develop` branch is protected with:
- ✅ Requires pull request reviews (1 approval minimum)
- ✅ Blocks force pushes (`git push --force` disabled)
- ✅ Prevents branch deletion
- ✅ Enforced for administrators (no bypass)

**Workflow**:
1. Work on `rebuild` branch (current)
2. Commit changes with conventional commits (feat:, fix:, chore:, etc.)
3. Push to `origin/rebuild`
4. When ready: Create PR from `rebuild` → `develop`
5. Get 1 approval
6. Merge to `develop`
7. Eventually: Merge `develop` → `main` for production

**Git Commands**:
```bash
# Commit changes
git add .
git commit -m "feat: add personnel repository with Prisma"

# Push to rebuild branch
git push origin rebuild

# Create pull request (when ready)
gh pr create --base develop --head rebuild --title "Backend Rebuild" --body "..."

# Check branch protection status
gh api repos/DeadshotOMEGA/sentinel/branches/develop/protection
```

**CI/CD**: Tests, type-check, and lint run automatically on PR creation

## Architecture Decisions

### Why NOT Bun?
HeroUI (frontend library) has compatibility issues with Bun runtime. Using Node.js + pnpm instead.

### Why Express over Fastify/Hono?
Express + Node is already proven, massive ecosystem, zero learning curve. Migration risk not justified unless performance becomes inadequate.

### Why Prisma + Kysely Hybrid?
- **Prisma**: Excellent DX for schema evolution (15+ models)
- **Kysely**: Best query performance for complex queries (50ms vs 110ms)
- **Raw SQL**: Use for bulk imports with `COPY` (3x faster than any ORM)

### Why better-auth?
- Built-in API key plugin (perfect for kiosks)
- Modern JWT sessions with refresh rotation
- Self-hosted, zero vendor lock-in
- Offline-capable (critical for kiosks)
- TypeScript-native

### Why ts-rest over tRPC?
- Keeps RESTful API design (needed for public API)
- Generates OpenAPI docs automatically
- End-to-end type safety without code generation
- Works with existing Express routes

### Why Valibot over Zod?
- 90% smaller bundle (1.37KB vs 20KB)
- Faster tree-shaking
- Similar API to Zod for easy migration

## Next Steps

1. ✅ Claude Code setup complete
2. ⏳ Initialize backend scaffolding (package.json, tsconfig, etc.)
3. ⏳ Set up Prisma schema
4. ⏳ Implement testing infrastructure (Testcontainers, Supertest)
5. ⏳ Migrate to better-auth
6. ⏳ Implement ts-rest API contracts

---

For questions or issues, see the research docs or consult the specialized agents.
