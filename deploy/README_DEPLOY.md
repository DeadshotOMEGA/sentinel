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

- `Install Sentinel Appliance`
- `Update Sentinel Appliance`
- `Upgrade Sentinel`

Or run directly:

```bash
sentinel-install
sentinel-update
sentinel-upgrade
```

## If your laptop currently runs Windows

1. Back up any Windows data you need.
2. Create a bootable Ubuntu 24.04 LTS USB installer from Windows:
   - Download Ubuntu 24.04 ISO from ubuntu.com.
   - Use Rufus (or equivalent) to write the ISO to USB.
3. Boot the laptop from the USB and install Ubuntu 24.04 LTS.
4. During Ubuntu setup:
   - Connect to the Unit network.
   - Complete captive portal checkbox/splash page in Firefox/Chrome if prompted.
5. Copy this `deploy/` folder to the Ubuntu laptop (USB stick or network share).

## Fresh install (Ubuntu 24.04)

### Easiest (double-click launcher)

1. Open the `deploy` folder in Files.
2. Double-click `Install Sentinel Appliance.desktop`.
3. If Ubuntu prompts, choose **Allow Launching**.
4. Enter version tag when prompted (example: `v1.1.8`).

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
- `CAPTIVE_PORTAL_RECOVERY_ENABLED=false` (register local Wi-Fi recovery helper used by Sentinel UI action)
- `CAPTIVE_PORTAL_AUTO_RECOVER=false` (run the helper automatically in the logged-in Ubuntu session)
- `CAPTIVE_PORTAL_TAILSCALE_TARGET=` optional extra reachability target, such as a Tailscale IP or HTTPS health URL

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

## Captive portal / GHCR reachability failure

If install reports GHCR unreachable:

1. Open browser on the same laptop.
2. Visit `http://neverssl.com` (or any HTTP site).
3. Complete the captive portal checkbox/splash flow.
4. Re-run install:

```bash
./install.sh --version vX.Y.Z
```

## Optional captive portal auto-recovery

If your deployment laptop sits behind a hotel/base/public Wi-Fi portal that expires daily, Sentinel can now register a local helper on the Ubuntu laptop.

Enable it in `/opt/sentinel/deploy/.env`:

```env
CAPTIVE_PORTAL_RECOVERY_ENABLED=true
CAPTIVE_PORTAL_AUTO_RECOVER=true
# Optional but useful when backend access depends on Tailscale:
CAPTIVE_PORTAL_TAILSCALE_TARGET=100.64.0.10
```

Then re-run:

```bash
cd /opt/sentinel/deploy
./update.sh --version vX.Y.Z
```

What this does:

- registers a local `sentinel-recover://` URL handler on the laptop
- enables the `Launch Wi-Fi Recovery` action in Sentinel's System Status dropdown
- optionally starts a user-session watcher after login that checks Wi-Fi + internet access, then opens `http://neverssl.com` and sends the configured `Tab`, `Space`, `Return` sequence when captive-portal recovery is needed

Tuning values in `.env`:

- `CAPTIVE_PORTAL_RECOVERY_CHECK_URL` default `https://connectivitycheck.gstatic.com/generate_204`
- `CAPTIVE_PORTAL_RECOVERY_PORTAL_URL` default `http://neverssl.com`
- `CAPTIVE_PORTAL_RECOVERY_DELAY_SECONDS` default `8`
- `CAPTIVE_PORTAL_RECOVERY_TAB_COUNT` default `1`
- `CAPTIVE_PORTAL_RECOVERY_COOLDOWN_SECONDS` default `900`
- `CAPTIVE_PORTAL_RECOVERY_INTERVAL_SECONDS` default `60`
- `CAPTIVE_PORTAL_RECOVERY_FAILURE_THRESHOLD` default `2`

Notes:

- This helper runs on the Ubuntu desktop session, not inside Docker.
- `xdotool` only works when a graphical session is logged in.
- Leave `CAPTIVE_PORTAL_AUTO_RECOVER=false` if you want the manual Sentinel button only.

## Update

### Easiest (double-click launcher)

1. Open `/opt/sentinel/deploy` in Files.
2. Double-click `Update Sentinel Appliance.desktop`.
3. Enter target version tag when prompted.

### Terminal fallback

```bash
cd /opt/sentinel/deploy
./update.sh --version vX.Y.Z
```

This performs automatic pre-update backup, image pull, one-shot migration deploy, migration status verification, and health gate verification.
When update is launched from a newer deploy bundle outside `/opt/sentinel/deploy`, it now auto-syncs scripts into `/opt/sentinel/deploy` first (while preserving `.env` and `.appliance-state`) and then re-runs from the synced location.

## Upgrade Sentinel (recommended patch workflow)

Use the new upgrade flow when you want to:

- upgrade to latest stable quickly,
- upgrade or downgrade to a specific release tag,
- refresh `/opt/sentinel/deploy` from the new package before running update logic.

Desktop:

1. Open `/opt/sentinel/deploy`.
2. Double-click `Upgrade Sentinel.desktop`.
3. Choose one:
   - latest stable,
   - a recent release from list,
   - or manual `vX.Y.Z` entry.
4. Review advanced options:
   - Observability stack (`--with-obs`) default ON
   - Publish Grafana on LAN (`--allow-grafana-lan`) default ON
   - Publish Wiki on LAN (`--allow-wiki-lan`) default ON
   - Dry run (validation only) default OFF

CLI:

```bash
sentinel-upgrade
```

or for explicit targets:

```bash
sentinel-upgrade --latest
sentinel-upgrade --version v1.4.4
# non-interactive (for scripts/automation):
sentinel-upgrade --latest --yes
```

The upgrade launcher verifies package checksums before install, installs the selected `.deb`, then executes the updated `/opt/sentinel/deploy/update.sh`.
This deployment-tooling change is released as a patch update (for example `v1.4.4`), not a minor release.

Optional update flags:

- `--with-obs` / `--without-obs`
- `--allow-grafana-lan` / `--disallow-grafana-lan`
- `--allow-wiki-lan` / `--disallow-wiki-lan`
- `--no-firewall`

## Automatic upgrade helper

If you want unattended upgrade checks on a deployment laptop, use:

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
- Installer/update then verifies schema parity with migration files:
  `docker compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code'`
- If update/install fails with `ERR_PNPM_RECOURSIVE_EXEC_FIRST_FAIL` around `prisma migrate diff`, the underlying problem is usually schema drift on that appliance database, not pnpm itself. Capture the real drift summary with:
  - `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma migrate status"`
  - `docker compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma'`
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
