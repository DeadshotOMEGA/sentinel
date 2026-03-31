# Sentinel

RFID attendance and operations management platform for HMCS Chippawa.

Sentinel combines a TypeScript backend API, a Next.js admin dashboard, shared contracts/types, and appliance deployment tooling for reliable on-site operation.

## Current Release Status (March 31, 2026)

- Workspace/source version: `2.1.0`
- Latest published GitHub release: [`v2.1.0`](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v2.1.0) (published March 31, 2026)
- Latest git tag in repo: `v2.1.0`

## Program Phase Status

- Phase 1: Core platform foundation - complete
- Phase 2: Backend/API hardening - complete
- Phase 3: Frontend Admin operational workflows - complete
- Phase 4: Deployment appliance and update tooling - complete
- Phase 5: Kiosk and day-duty operational UX - complete
- Phase 6: Ongoing refinement, observability, and operator efficiency - active
- Phase 7: Report generation and report-command workflows - planned

### Phase 7 Focus: Reporting and Command Options (Planned)

Phase 7 will focus on building a complete reporting layer for operations and leadership workflows, including:

- Detailed attendance and check-in trend reports
- Duty/watch and DDS operational summary reports
- Printable report formats for handover and briefing packages
- Export-friendly formats (PDF/CSV) for archive and sharing workflows
- Command-driven report generation for repeatable operations

Planned command-style workflows (examples):

```bash
pnpm reports:generate -- --type attendance --range this-week --format pdf
pnpm reports:generate -- --type dds-summary --date 2026-03-31 --format printable
pnpm reports:generate -- --type lockup --range month --format csv
```

## Monorepo Layout

```text
sentinel/
├── apps/
│   ├── backend/                 # Express + ts-rest API (port 3000)
│   └── frontend-admin/          # Next.js admin UI (port 3001)
├── packages/
│   ├── contracts/               # Shared ts-rest contracts and schemas
│   ├── database/                # Prisma schema/client/migrations
│   └── types/                   # Shared TypeScript domain types
├── deploy/                      # Ubuntu appliance deployment bundle
├── docs/                        # Architecture, guides, runbooks, domain docs
├── monitoring/                  # Grafana/Prometheus/Loki configs
└── scripts/                     # Repo automation and utilities
```

## Core Components

| Component                      | Purpose                                      | Default                       |
| ------------------------------ | -------------------------------------------- | ----------------------------- |
| Backend API                    | REST/WebSocket API, auth, health, metrics    | `http://localhost:3000`       |
| Frontend Admin                 | Operations dashboard and workflows           | `http://localhost:3001`       |
| Kiosk Mode (Frontend route)    | Touch-first check-in and visitor intake flow | `http://localhost:3001/kiosk` |
| Wiki.js (dev helper container) | In-app help/docs                             | `http://localhost:3002`       |
| PostgreSQL                     | Primary datastore                            | `localhost:5432`              |
| Redis                          | Cache/rate limiting support                  | `localhost:6379`              |

## Tech Stack (Current)

- Runtime: Node.js `24.x`
- Package manager: `pnpm` `10.x`
- Language: TypeScript (strict mode)
- Backend: Express, ts-rest, Prisma, Socket.IO, Valibot
- Frontend: Next.js 16, React 19, Tailwind CSS 4, DaisyUI, TanStack Query, Zustand
- Infra/dev tooling: Docker Compose, GitHub Actions, Husky, ESLint, Prettier

## Quick Start (Local Development)

### Prerequisites

- Node.js `24.x`
- pnpm `10.x`
- Docker + Docker Compose v2

### 1) Install dependencies

```bash
pnpm install
```

### 2) Create local environment file (if needed)

```bash
cp .env.example .env
```

### 3) Start full local stack (recommended)

```bash
pnpm dev:all
```

This command:

- syncs workspace versions to root (`pnpm version:sync`)
- ensures Docker services are running
- starts backend + frontend concurrently

### 4) Verify

```bash
curl http://localhost:3000/health
open http://localhost:3001/dashboard
open http://localhost:3000/docs
```

### Common local commands

```bash
pnpm dev:backend
pnpm dev:frontend
pnpm dev:all:core
pnpm typecheck
pnpm lint
pnpm build
pnpm version:check
```

## Deployment Appliance (Ubuntu 24.04)

Sentinel ships an appliance deployment bundle in [`deploy/`](./deploy) with install/update/upgrade flows and desktop launchers.

Primary docs:

- [`deploy/README_DEPLOY.md`](./deploy/README_DEPLOY.md)

Primary commands:

```bash
cd /opt/sentinel/deploy
./install.sh --version vX.Y.Z
./update.sh --version vX.Y.Z
sentinel-upgrade --latest
```

Notable deployment capabilities:

- Debian package distribution (`sentinel_<version>_all.deb`)
- Automated upgrade flow with release selection
- Captive portal recovery helper + optional auto-recovery watcher
- Optional observability profile and LAN publishing controls

## System Status and Recovery

The Frontend Admin status dropdown tracks:

- Database
- Backend API
- Frontend
- Wiki

It also supports deployment-laptop recovery actions when connectivity is degraded:

- `sentinel-recover://run` launcher
- fallback portal open (`http://neverssl.com`)

## Versioning and Release Policy

### Version source of truth

- Root `package.json` version is authoritative.
- Workspace versions are synchronized with:
  - `pnpm version:sync`
  - `pnpm version:check`
- Sync script: [`scripts/sync-workspace-versions.mjs`](./scripts/sync-workspace-versions.mjs)

### Branching and releases

- `main` is the long-lived integration branch.
- Daily work uses `feature/*`, `fix/*`, or `hotfix/*`.
- Release stabilization may use temporary `release/vX.Y.Z` branches.
- Release branches must merge back to `main` before tagging `vX.Y.Z`.

## Documentation Map

- Backend: [`apps/backend/README.md`](./apps/backend/README.md)
- Frontend Admin: [`apps/frontend-admin/README.md`](./apps/frontend-admin/README.md)
- Deployment: [`deploy/README_DEPLOY.md`](./deploy/README_DEPLOY.md)
- Engineering docs index: [`docs/`](./docs)

## Release Evolution (Compared Across All Releases)

Compared across all published GitHub releases from `v1.0.0` through `v2.1.0`:

- `v1.0.0` to `v1.1.x`: appliance/deploy baseline established and hardened (bootstrap, migration reliability, secret generation, installer improvements)
- `v1.2.x`: production hardening continued, kiosk standalone mode introduced, backend rate-limit and health/status fixes landed
- `v1.3.x`: Wiki.js/help integration and release-track workflow automation expanded
- `v1.4.x`: authentication and admin flows improved, Tailscale inventory support added, dev simulation tooling refined
- `v1.5.x`: wiki publishing tooling + dashboard/admin workflow improvements
- `v1.6.x`: kiosk redesign and major lockup/DDS/dashboard behavior fixes
- `v1.7.x`: CI/release-track robustness and database/deploy diagnostics hardening
- `v2.0.0`: milestone release with DDS drawer and workflow polish
- `v2.1.0`: captive portal recovery automation, richer system status/health context, and root-driven workspace version governance

### Published GitHub Releases

All releases: <https://github.com/DeadshotOMEGA/sentinel/releases>

| Tag       | Date       | Link                                                                      |
| --------- | ---------- | ------------------------------------------------------------------------- |
| `v1.0.0`  | 2026-02-20 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.0.0)  |
| `v1.1.1`  | 2026-02-21 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.1)  |
| `v1.1.2`  | 2026-02-21 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.2)  |
| `v1.1.3`  | 2026-02-21 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.3)  |
| `v1.1.4`  | 2026-02-21 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.4)  |
| `v1.1.5`  | 2026-02-21 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.5)  |
| `v1.1.6`  | 2026-02-21 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.6)  |
| `v1.1.7`  | 2026-02-22 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.7)  |
| `v1.1.8`  | 2026-02-22 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.8)  |
| `v1.1.9`  | 2026-02-22 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.9)  |
| `v1.1.10` | 2026-02-22 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.10) |
| `v1.1.11` | 2026-02-22 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.11) |
| `v1.1.12` | 2026-02-22 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.12) |
| `v1.1.13` | 2026-02-22 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.13) |
| `v1.1.14` | 2026-02-22 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.14) |
| `v1.1.15` | 2026-02-22 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.1.15) |
| `v1.2.0`  | 2026-02-23 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.2.0)  |
| `v1.2.1`  | 2026-02-23 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.2.1)  |
| `v1.2.2`  | 2026-02-24 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.2.2)  |
| `v1.2.3`  | 2026-02-24 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.2.3)  |
| `v1.2.4`  | 2026-02-24 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.2.4)  |
| `v1.2.5`  | 2026-02-24 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.2.5)  |
| `v1.2.6`  | 2026-02-24 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.2.6)  |
| `v1.2.7`  | 2026-02-24 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.2.7)  |
| `v1.3.0`  | 2026-02-25 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.3.0)  |
| `v1.3.1`  | 2026-02-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.3.1)  |
| `v1.3.2`  | 2026-02-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.3.2)  |
| `v1.4.0`  | 2026-02-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.4.0)  |
| `v1.4.1`  | 2026-02-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.4.1)  |
| `v1.4.2`  | 2026-02-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.4.2)  |
| `v1.4.3`  | 2026-02-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.4.3)  |
| `v1.4.4`  | 2026-02-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.4.4)  |
| `v1.4.5`  | 2026-02-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.4.5)  |
| `v1.4.6`  | 2026-02-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.4.6)  |
| `v1.5.0`  | 2026-03-03 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.5.0)  |
| `v1.5.1`  | 2026-03-03 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.5.1)  |
| `v1.5.2`  | 2026-03-23 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.5.2)  |
| `v1.6.0`  | 2026-03-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.6.0)  |
| `v1.6.1`  | 2026-03-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.6.1)  |
| `v1.6.2`  | 2026-03-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.6.2)  |
| `v1.6.3`  | 2026-03-27 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.6.3)  |
| `v1.6.4`  | 2026-03-30 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.6.4)  |
| `v1.7.0`  | 2026-03-30 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.7.0)  |
| `v1.7.1`  | 2026-03-30 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.7.1)  |
| `v1.7.2`  | 2026-03-30 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v1.7.2)  |
| `v2.0.0`  | 2026-03-30 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v2.0.0)  |
| `v2.1.0`  | 2026-03-31 | [Release](https://github.com/DeadshotOMEGA/sentinel/releases/tag/v2.1.0)  |

## Contributing

1. Create a branch from `main` (`feature/*`, `fix/*`, or `hotfix/*`).
2. Keep commits in Conventional Commit format.
3. Run checks before PR:

```bash
pnpm version:check
pnpm typecheck
pnpm lint
pnpm build
```

4. Open a PR (never push directly to `main`).

## License

Private - HMCS Chippawa internal use only.
