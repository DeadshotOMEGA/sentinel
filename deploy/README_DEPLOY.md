# Sentinel Appliance Deployment (Ubuntu 24.04)

This bundle installs Sentinel as a LAN appliance using Docker Compose v2 and GHCR version-tagged images.

## What gets deployed

- Caddy reverse proxy on `80:80` + `443:443`
- Backend API on internal Docker network (`3000`)
- Frontend Next runtime on internal Docker network (`3001`)
- PostgreSQL with persistent volume
- Wiki.js + dedicated Wiki PostgreSQL on internal Docker network
- Kroki diagram rendering service on internal Docker network
- Optional observability profile (`obs`): Loki, Prometheus, Promtail, Grafana

Canonical public routes:

- `/` -> frontend
- `/api/*` -> backend (prefix preserved)
- `/socket.io*` -> backend (path preserved)
- `/healthz` -> backend `/health`
- `http://docs.sentinel.local/*` -> Wiki.js

## Debian package launcher (recommended for non-technical users)

Release assets now include a Debian package:

- `sentinel_<version>_all.deb`

Install it on Ubuntu:

```bash
sudo apt install ./sentinel_<version>_all.deb
```

Then launch from app menu:

- `Sentinel Install and Update`

Or run directly:

```bash
sentinel-install-update
```

## If your laptop currently runs Windows

1. Back up any Windows data you need.
2. Create a bootable Ubuntu 24.04 LTS USB installer from Windows:
   - Download Ubuntu 24.04 ISO from ubuntu.com.
   - Use Rufus (or equivalent) to write the ISO to USB.
3. Boot the laptop from the USB and install Ubuntu 24.04 LTS.
4. During Ubuntu setup:
   - Connect to the Unit network or approved Sentinel hotspot.
   - Verify the laptop can reach the internet before continuing.
5. Copy this `deploy/` folder to the Ubuntu laptop (USB stick or network share).

## Fresh install (Ubuntu 24.04)

### Easiest (double-click launcher)

1. Open the `deploy` folder in Files.
2. Double-click `Sentinel Install and Update.desktop`.
3. If Ubuntu prompts, choose **Allow Launching**.
4. A terminal window opens and prompts for the version number to install or update (example: `1.1.8`).

### Terminal fallback

```bash
cd deploy
./install.sh --version vX.Y.Z
```

Installer behavior:

- If `.env` is missing, installer creates it from `.env.example`.
- If secret fields still have placeholders (for example `change-this-...`, `replace-this-...`, or `changeme`), installer auto-generates secure random values.
- Installer writes a root-only snapshot of service credentials to `/opt/sentinel/credentials/service-secrets.env`.
- Installer enforces appliance mDNS hostname from `MDNS_HOSTNAME` (default `sentinel`) and ensures mDNS packages/services are present.
- Installer/update also maintain a local `/etc/hosts` alias so `docs.sentinel.local` resolves on the appliance itself without manual host-file edits.
- You can still edit `.env` later for custom settings.

If operators will browse by IP (`http://<server-ip>`), ensure `CORS_ORIGIN` in `.env` includes both hostname and IP origins, for example:

```env
CORS_ORIGIN=http://sentinel.local,http://192.168.1.50,http://localhost,http://127.0.0.1
```

`install.sh` and `update.sh` also auto-append the detected server IP to `CORS_ORIGIN` as a safeguard.

Optional flags:

- `--lan-cidr 192.168.0.0/16` override detected LAN subnet
- `--with-obs` enable observability profile (default)
- `--without-obs` disable observability profile
- `--allow-grafana-lan` publish Grafana on `3010` (only with `--with-obs`)
- `--allow-wiki-lan` publish Wiki.js on `3020` (optional)
- `--no-firewall` skip UFW LAN-only rule setup

Port defaults in `.env`:

- `APP_HTTP_PORT=80` (Caddy appliance entrypoint)
- `APP_HTTPS_PORT=443` (Caddy HTTPS bind port)
- `MDNS_HOSTNAME=sentinel` (published as `http://sentinel.local`)
- `GRAFANA_LAN_PORT=3010` (only used if `--allow-grafana-lan`)
- `GRAFANA_ROOT_URL=http://localhost:3010` (matches Grafana LAN port when enabled)
- `WIKI_DOMAIN=docs.sentinel.local`
- `WIKI_BASE_URL=http://docs.sentinel.local`
- `NEXT_PUBLIC_WIKI_BASE_URL=http://docs.sentinel.local`
- `WIKI_POSTGRES_USER`, `WIKI_POSTGRES_PASSWORD`, `WIKI_POSTGRES_DB` (dedicated Wiki DB)
- `WIKI_IMAGE_TAG=2.5.312` (pin for reproducible deploys)
- `KROKI_IMAGE_TAG=0.30.0` (pin for reproducible self-hosted Kroki)
- `KROKI_SERVER_URL=http://kroki:8000` (internal Wiki.js renderer target)
- `WIKI_LAN_PORT=3020` (only used if `--allow-wiki-lan`)
- `HOTSPOT_CONNECTION_NAME=Sentinel Hotspot` (NetworkManager profile name for the hosted hotspot)
- `NETWORK_REACHABILITY_CHECK_URL=https://connectivitycheck.gstatic.com/generate_204` (host-level internet probe)
- `NETWORK_REMOTE_REACHABILITY_TARGET=` optional extra reachability target, such as a Tailscale IP or HTTPS health URL
- `NETWORK_STATUS_SNAPSHOT_INTERVAL_SECONDS=30` (how often the Ubuntu host writes Wi-Fi/internet telemetry for Sentinel)

Canonical Sentinel port allocation policy (host/LAN):

- Backend API: `3000`
- Frontend apps: `3001-3003`
- Kiosk (future): `3004`
- Door Scanners (future): `3005-3006`
- Observability stack (Grafana/Prometheus/Loki/etc.): `3010-3019`
- Additional services (Wiki and future additions): `3020-3029`

Recommended initial assignment:

- Wiki.js (when enabled): `3020`

Kroki is internal-only by default:

- no host/LAN port is published
- Wiki.js reaches it over Docker network at `http://kroki:8000`
- this keeps diagram source content inside the appliance network boundary

## Network / GHCR reachability failure

If install reports GHCR unreachable:

1. Confirm the laptop has working internet access.
2. If you are using the Sentinel hotspot, reconnect the laptop to the approved SSID.
3. If you are using building/public Wi-Fi, complete any required captive portal in a browser.
4. Re-run install:

```bash
./install.sh --version vX.Y.Z
```

## Hotspot helpers

Install/update now provisions hotspot and update helpers:

- a local `sentinel-hotspot://connect?ssid=<approved-ssid>` URL handler that tries to reconnect the current laptop to the approved hotspot, then falls back to Wi-Fi settings
- a host-side recovery queue watched by systemd so the webapp can ask the deployment server to repair the hosted hotspot without interactive root access
- a managed sudoers entry for the desktop operator account so hotspot recovery commands can be run non-interactively (no password prompt) when needed
- a host-side update queue watched by systemd so the webapp can request a non-interactive `--latest` upgrade run

Relevant runtime paths:

- local reconnect handler: `/opt/sentinel/deploy/sentinel-hotspot-connect.sh`
- queued recovery requests: `/opt/sentinel/deploy/runtime/hotspot-recovery/requests`
- processed requests: `/opt/sentinel/deploy/runtime/hotspot-recovery/processed`
- failed requests: `/opt/sentinel/deploy/runtime/hotspot-recovery/failed`
- queued system-update requests: `/opt/sentinel/deploy/runtime/system-update/requests`
- processed system-update requests: `/opt/sentinel/deploy/runtime/system-update/processed`
- failed system-update requests: `/opt/sentinel/deploy/runtime/system-update/failed`

Relevant systemd units:

- `sentinel-host-hotspot-recovery.path`
- `sentinel-host-hotspot-recovery.service`
- `sentinel-system-update-request.path`
- `sentinel-system-update-request.service`

## Host network telemetry

Sentinel now writes a host-level network snapshot on the Ubuntu laptop every 30 seconds and bind-mounts it into the backend container. This is what powers the `Network` row in System Status.

What it checks:

- whether Wi-Fi is connected
- the current SSID
- the host IP address that operators can use on the local hotspot/LAN
- whether the configured Sentinel hotspot SSID is visible from the laptop's non-host Wi-Fi adapter (when available)
- whether the configured internet reachability URL succeeds
- whether the optional `NETWORK_REMOTE_REACHABILITY_TARGET` is reachable

Where it lives:

- host file: `/opt/sentinel/deploy/runtime/network-status/network-status.json`
- container path: `/var/run/sentinel/network-status/network-status.json`

systemd units installed during install/update/rollback:

- `sentinel-network-status.service`
- `sentinel-network-status.timer`
- `sentinel-host-hotspot-recovery.path`
- `sentinel-host-hotspot-recovery.service`
- `sentinel-system-update-request.path`
- `sentinel-system-update-request.service`

## Install and Update

### Easiest (double-click launcher)

1. Open `/opt/sentinel/deploy` in Files.
2. Double-click `Sentinel Install and Update.desktop`.
3. Enter the target Sentinel version when prompted in the terminal.

### Terminal fallback

```bash
cd /opt/sentinel/deploy
./update.sh --version vX.Y.Z
```

This guided flow handles both install and update:

- prompts for the release version,
- downloads the matching Debian package from GitHub Releases,
- installs the package,
- runs `/opt/sentinel/deploy/update.sh --version vX.Y.Z`.
- `--no-firewall`

## Automatic upgrade helper

If you want unattended upgrade checks on the Sentinel server laptop, use:

```bash
cd /opt/sentinel/deploy
./auto-upgrade.sh
```

Behavior:

- reads current `SENTINEL_VERSION` from `.env`
- checks latest GitHub release for the configured owner (`GHCR_OWNER`)
- runs non-interactive `upgrade-launcher.sh --latest --yes` only when a newer version exists
- applies `AUTO_UPGRADE_WITH_OBS`, `AUTO_UPGRADE_ALLOW_GRAFANA_LAN`, `AUTO_UPGRADE_ALLOW_WIKI_LAN` when set in `.env`

To schedule it, run the script from cron or a systemd timer as root.

## Rollback

```bash
cd /opt/sentinel/deploy
./rollback.sh
```

Or rollback to a specific tag:

```bash
./rollback.sh --version vX.Y.Z
```

## Backup

```bash
cd /opt/sentinel/deploy
./backup.sh
```

Defaults:

- Scope defaults to `all` and writes both Sentinel + Wiki dump files.
- Output directory defaults to `/opt/sentinel/deploy/backups`.

Single-scope examples:

```bash
./backup.sh --scope sentinel --output /opt/sentinel/backups/sentinel_manual.dump
./backup.sh --scope wiki --output /opt/sentinel/backups/wikijs_manual.dump
```

## Restore

```bash
cd /opt/sentinel/deploy
./restore.sh --scope sentinel --file /opt/sentinel/backups/sentinel_YYYYMMDD_HHMMSS.dump
```

Wiki-only restore:

```bash
./restore.sh --scope wiki --file /opt/sentinel/backups/wikijs_YYYYMMDD_HHMMSS.dump
```

Combined restore:

```bash
./restore.sh --scope all \
  --sentinel-file /opt/sentinel/backups/sentinel_YYYYMMDD_HHMMSS.dump \
  --wiki-file /opt/sentinel/backups/wikijs_YYYYMMDD_HHMMSS.dump
```

Non-interactive restore:

```bash
./restore.sh --scope sentinel --file /opt/sentinel/backups/file.dump --yes
```

## Service management

Installed systemd unit:

```bash
sudo systemctl status sentinel-appliance.service
sudo systemctl restart sentinel-appliance.service
```

## URLs after install

- mDNS (best effort): `http://<MDNS_HOSTNAME>.local` (default `http://sentinel.local`)
- Wiki docs host: `http://docs.sentinel.local` (appliance-local alias maintained automatically)
- LAN fallback: `http://<server-ip>`
- Optional direct Wiki LAN URL (if enabled): `http://<server-ip>:3020`

## Health check

```bash
curl -f http://127.0.0.1/healthz
```

Post-upgrade UI smoke checks (recommended):

- Dashboard Presence loads.
- Members and Badges pages load.
- Logs page (`/logs`) opens without 404.
- System Status shows the deployed version (for example `v1.4.4`).

## Notes

- Compose v2 is required (`docker compose`).
- `SENTINEL_VERSION` must be explicit (never `latest`).
- Installer auto-runs:
  - `sudo systemctl daemon-reload`
  - `sudo systemctl enable sentinel-appliance.service`
  - `sudo systemctl start sentinel-appliance.service`
- A protected bootstrap Sentinel login is automatically created/maintained:
  - Badge: `0000000000`
  - PIN: `0000`
  - This record is guarded in API/repository paths and by DB delete triggers.
  - Runtime integrity checks enforce the bootstrap account state on backend startup.
  - The bootstrap PIN is fixed (`0000`) and cannot be changed through auth APIs.
  - The bootstrap account bypasses forced PIN-change gating to guarantee setup/recovery access.
- Fresh install now forces bootstrap mode to create all tables first and keep them empty:
  - `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma db push"`
  - `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database prisma:baseline"`
- Installer/update/rollback then enforce the bootstrap account and protections:
  - `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/backend sentinel:bootstrap-account"`
- Installer/update/rollback also ensure default enums exist (insert-missing only; does not overwrite unit-customized entries):
  - `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/backend sentinel:seed-default-enums"`
- If `_prisma_migrations` contains failed rows, installer auto-resolves them as rolled back before bootstrapping/baselining.
- Installer/update then verifies migration status:
  `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma migrate status"`
- Updates run `prisma:migrate:deploy:safe` automatically, so newly added tables/columns
  (for example `remote_systems` and `member_sessions` presence-tracking columns) are applied on appliance upgrades.
- Installer/update then verifies database parity against the canonical Prisma schema:
  `docker compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code'`
- A follow-up migration drops the legacy `remote_systems.updated_at DEFAULT CURRENT_TIMESTAMP` so the migration chain matches the canonical Prisma schema (`@updatedAt` with no DB default).
- If Prisma diff detects exactly that one legacy default drift on an appliance, the updater auto-remediates it by running `ALTER TABLE "remote_systems" ALTER COLUMN "updated_at" DROP DEFAULT;`, then re-runs the parity check. Any other drift still fails closed.
- If update/install fails with `ERR_PNPM_RECOURSIVE_EXEC_FIRST_FAIL` around `prisma migrate diff`, the underlying problem is usually schema drift on that appliance database, not pnpm itself. Capture the real drift summary with:
  - `docker compose --env-file /opt/sentinel/deploy/.env -f /opt/sentinel/deploy/docker-compose.yml exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma migrate status"`
  - `docker compose --env-file /opt/sentinel/deploy/.env -f /opt/sentinel/deploy/docker-compose.yml exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma'`
  - `docker compose --env-file /opt/sentinel/deploy/.env -f /opt/sentinel/deploy/docker-compose.yml exec -T postgres psql -U sentinel -d sentinel -c "SELECT column_default FROM information_schema.columns WHERE table_schema = '\''public'\'' AND table_name = '\''remote_systems'\'' AND column_name = '\''updated_at'\'';"`
  - If Docker on that appliance requires elevation, replace `docker` with `sudo docker`.
  - This is most common on appliances whose database history predates the canonical `0_init` Prisma baseline introduced on February 21, 2026.

## Members + badges transfer (local -> deployed)

Use the backend import/export scripts to move member + badge records without manual re-entry.

### 1) Export from local Sentinel

```bash
pnpm --filter @sentinel/backend sentinel:export-members-badges --output ./members-badges-export.json
```

### 2) Copy export file to deployed appliance

Example (adjust host/path):

```bash
scp ./members-badges-export.json user@sentinel-host:/opt/sentinel/deploy/members-badges-export.json
```

### 3) Import on deployed Sentinel

```bash
cd /opt/sentinel/deploy
docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/backend sentinel:import-members-badges --input /opt/sentinel/deploy/members-badges-export.json"
```

Notes:

- Protected Sentinel bootstrap account is excluded from transfer.
- Import upserts by `serviceNumber` (members) and `serialNumber` (badges).
- Members with rank codes missing on target are skipped and reported.
