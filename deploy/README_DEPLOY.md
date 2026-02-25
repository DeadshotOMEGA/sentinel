# Sentinel Appliance Deployment (Ubuntu 24.04)

This bundle installs Sentinel as a LAN appliance using Docker Compose v2 and GHCR version-tagged images.

## What gets deployed

- Caddy reverse proxy on `80:80` (only published service)
- Backend API on internal Docker network (`3000`)
- Frontend Next runtime on internal Docker network (`3001`)
- PostgreSQL with persistent volume
- Wiki.js + dedicated Wiki PostgreSQL on internal Docker network
- NetBird server + dashboard (self-hosted) with STUN on `3478/udp`
- Optional observability profile (`obs`): Loki, Prometheus, Promtail, Grafana

Canonical public routes:

- `/` -> frontend
- `/api/*` -> backend (prefix preserved)
- `/socket.io*` -> backend (path preserved)
- `/healthz` -> backend `/health`
- `http://docs.sentinel.local/*` -> Wiki.js
- `http://netbird.local/*` -> NetBird (dashboard + API)

## Debian package launcher (recommended for non-technical users)

Release assets now include a Debian package:

- `sentinel-appliance-tools_<version>_all.deb`

Install it on Ubuntu:

```bash
sudo apt install ./sentinel-appliance-tools_<version>_all.deb
```

Then launch from app menu:

- `Install Sentinel Appliance`
- `Update Sentinel Appliance`

Or run directly:

```bash
sentinel-install
sentinel-update
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
- `NETBIRD_DOMAIN=netbird.local`
- `NETBIRD_PROTOCOL=http`
- `NETBIRD_HTTP_PORT=80`
- `GRAFANA_LAN_PORT=3010` (only used if `--allow-grafana-lan`)
- `GRAFANA_ROOT_URL=http://localhost:3010` (matches Grafana LAN port when enabled)
- `WIKI_DOMAIN=docs.sentinel.local`
- `WIKI_BASE_URL=http://docs.sentinel.local`
- `NEXT_PUBLIC_WIKI_BASE_URL=http://docs.sentinel.local`
- `WIKI_POSTGRES_USER`, `WIKI_POSTGRES_PASSWORD`, `WIKI_POSTGRES_DB` (dedicated Wiki DB)
- `WIKI_IMAGE_TAG=2.5.312` (pin for reproducible deploys)
- `WIKI_LAN_PORT=3020` (only used if `--allow-wiki-lan`)

Canonical Sentinel port allocation policy (host/LAN):

- Backend API: `3000`
- Frontend apps: `3001-3003`
- Kiosk (future): `3004`
- Door Scanners (future): `3005-3006`
- Observability stack (Grafana/Prometheus/Loki/etc.): `3010-3019`
- Additional services (Wiki and future additions): `3020-3029`

Recommended initial assignment:

- Wiki.js (when enabled): `3020`

## Captive portal / GHCR reachability failure

If install reports GHCR unreachable:

1. Open browser on the same laptop.
2. Visit `http://neverssl.com` (or any HTTP site).
3. Complete the captive portal checkbox/splash flow.
4. Re-run install:

```bash
./install.sh --version vX.Y.Z
```

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

Optional update flags:

- `--with-obs` / `--without-obs`
- `--allow-grafana-lan` / `--disallow-grafana-lan`
- `--allow-wiki-lan` / `--disallow-wiki-lan`
- `--no-firewall`

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

- mDNS (best effort): `http://sentinel.local`
- Wiki docs host: `http://docs.sentinel.local`
- NetBird dashboard: `http://netbird.local`
- LAN fallback: `http://<server-ip>`
- Optional direct Wiki LAN URL (if enabled): `http://<server-ip>:3020`

For NetBird, ensure `netbird.local` resolves to the appliance IP (use your LAN DNS or add a hosts entry on each client).

## Health check

```bash
curl -f http://127.0.0.1/healthz
```

## Notes

- Compose v2 is required (`docker compose`).
- `SENTINEL_VERSION` must be explicit (never `latest`).
- NetBird STUN listens on `3478/udp`; ensure LAN clients can reach it.
- Installer auto-runs:
  - `sudo systemctl daemon-reload`
  - `sudo systemctl enable sentinel-appliance.service`
  - `sudo systemctl start sentinel-appliance.service`
- A protected bootstrap Sentinel login is automatically created/maintained:
  - Badge: `0000000000`
  - PIN: `0000`
  - This record is guarded in API/repository paths and by DB delete triggers.
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
