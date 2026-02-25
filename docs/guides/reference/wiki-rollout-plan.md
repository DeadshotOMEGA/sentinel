# Sentinel Full Wiki.js Rollout Plan (Updated v2)

## Brief Summary

This rollout finalizes Sentinel's hybrid help architecture:

- Driver.js remains the in-app guided coach.
- Wiki.js is the durable, self-hosted operational knowledge base.
- Help flows resolve from `routeId` and tour context to stable wiki slugs with resilient fallback.

This v2 update adds the missing deployment/operations layer with port-policy alignment and production backup/restore workflows.

## Current Implementation Baseline

Already delivered in frontend-admin:

- Route help registry and role/fallback model.
- Help orchestrator and analytics events.
- `HelpButton` and Driver.js "Learn more" integration.
- Wiki availability probe API route.

Already delivered in policy/docs:

- Root port policy in `AGENTS.md`.
- Port allocation reference in `docs/guides/reference/port-allocation.md`.

## Architecture and Hosting

Deployment topology:

- `wikijs-postgres` (dedicated Wiki DB).
- `wikijs` (Wiki.js runtime).
- Caddy host route for `docs.sentinel.local`.

Storage:

- `wikijs_postgres_data`
- `wikijs_data`

Host/LAN exposure:

- Default access: `http://docs.sentinel.local` (via Caddy on host `80`).
- Optional direct LAN publish: `3020` (enabled with `--allow-wiki-lan`).

## Port Policy

Canonical host/LAN allocation:

- Backend: `3000`
- Frontend: `3001-3003`
- Kiosk (future): `3004`
- Door scanners (future): `3005-3006`
- Observability: `3010-3019`
- Additional services (Wiki/future): `3020-3029`

Wiki rollout assignments:

- Hostname route: `docs.sentinel.local`
- Optional direct LAN: `WIKI_LAN_PORT=3020`

## Deployment and Operations Changes

Updated deployment/runtime files:

- `deploy/docker-compose.yml`
- `deploy/docker-compose.wiki-lan.yml`
- `deploy/Caddyfile`
- `deploy/.env.example`
- `deploy/_common.sh`
- `deploy/install.sh`
- `deploy/update.sh`
- `deploy/backup.sh`
- `deploy/restore.sh`

Operational behavior:

- `ALLOW_WIKI_LAN` state persisted in `.appliance-state`.
- `--allow-wiki-lan` and `--disallow-wiki-lan` supported in install/update flow.
- systemd compose startup includes wiki-lan override only when enabled.
- Firewall allows wiki/grafana LAN ports only for configured LAN CIDR when enabled.

Backup/restore support:

- Backup scopes: `sentinel`, `wiki`, `all`.
- Restore scopes: `sentinel`, `wiki`, `all`.
- Supports sentinel-only, wiki-only, and combined recovery.

## Information Architecture

Canonical top-level Wiki tree:

- Start Here
- By Role
- By Screen
- Quick Reference
- Troubleshooting
- Emergency Procedures
- Technical Operations

MVP routes/pages (high support impact):

1. Dashboard
2. DDS / Day Duty
3. Checkins
4. Schedules
5. Members
6. Badges
7. Events

## Governance and CI Controls

Repository governance artifacts:

- Slug index: `docs/guides/reference/wiki-slug-index.json`
- CI validator: `scripts/check-help-slugs.mjs`
- CI integration: `.github/workflows/test.yml` (`pnpm check:help-slugs`)

PR expectations:

- Route help mapping entry (or explicit N/A waiver).
- Linked wiki slug/page.
- Driver.js tour delta when workflow changes.

## Risk Controls

- Drift between UI and docs: enforced via route mapping + slug index checks.
- Permission misconfiguration: default-deny role model with explicit editor/admin assignment.
- Link rot after IA changes: stable `routeId` and slug index governance.
- Restore uncertainty: dedicated wiki DB backup and scoped restore drills.

## Acceptance Gates

1. `wikijs` and `wikijs-postgres` healthy in compose.
2. `http://docs.sentinel.local` serves Wiki.js.
3. Optional LAN wiki exposure works on `3020` only when enabled.
4. Scoped backup/restore works for sentinel-only, wiki-only, and combined scenarios.
5. Help slug CI check passes with no missing registry mappings.
