# Codex Project Instructions (Sentinel)

This file migrates project guidance from Claude-style rules into Codex.

## Source of truth and precedence

- Primary rule source for Codex is `AGENTS.md` files throughout the repo.
- Read and follow the nearest `AGENTS.md` for the files you edit.
- Conflict resolution: closest directory rule wins; `MUST`/`MUST NOT` override `SHOULD`.

## Global non-negotiables

- Use `pnpm` (not Bun) and Node.js 24.x.
- Keep TypeScript strict and never introduce `any`.
- Use Conventional Commits.
- Never push directly to `main`; use PRs from `feature/*` to `main`.

## Port Allocation Policy (Host/LAN)

- MUST keep Sentinel service host ports within their assigned ranges:
  - Backend API: `3000`
  - Frontend apps: `3001-3003`
  - Kiosk (future): `3004`
  - Door Scanners (future): `3005-3006`
  - Observability stack (Grafana/Prometheus/Loki/etc.): `3010-3019`
  - Additional services (Wiki and future additions): `3020-3029`
- SHOULD use `3020` as the initial Wiki.js LAN publish port when wiki LAN access is enabled.
- MUST update deployment files and deployment docs together when adding/changing a port mapping.
- MUST avoid assigning new services to reserved but currently unused ranges unless explicitly approved.

## High-traffic local instruction files

- `apps/backend/AGENTS.md`
- `apps/backend/src/routes/AGENTS.md`
- `apps/backend/src/repositories/AGENTS.md`
- `apps/backend/src/middleware/AGENTS.md`
- `apps/backend/tests/AGENTS.md`
- `packages/contracts/AGENTS.md`
- `packages/database/AGENTS.md`
- `packages/database/prisma/AGENTS.md`
- `packages/database/src/AGENTS.md`

These files inline operational rules so Codex can proceed with minimal indirection.

## Path-specific rule mappings from `.claude/rules/`

- Monorepo/package edits (`pnpm-workspace.yaml`, `package.json`, `tsconfig.json`):
  follow `.claude/rules/90_monorepo-structure.md`.
- Frontend admin edits (`apps/frontend-admin/**`):
  follow `.claude/rules/frontend-design.md` and `.claude/rules/playwright-cli.md`.
- Terminology mapping:
  "DaisyUI MCP" maps to `mcp__daisyui-blueprint__daisyUI-Snippets`.

## Practical workflow for Codex

1. Identify files to change.
2. Load nearest instruction files.
3. Apply mandatory constraints first.
4. Treat `SHOULD` as defaults unless task requirements conflict.
5. For docs work, follow Diataxis and scoped naming/frontmatter rules.

## Structured Context (Pilot)

- Optional machine-readable context lives under `.ai/`:
  - `.ai/context.yaml` for project essentials
  - `.ai/workflows.yaml` for repeatable task flows
  - `.ai/architecture.yaml` for system boundaries
- Prefer loading these files only when needed for the task.
