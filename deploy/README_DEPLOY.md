# Sentinel Appliance Deployment (Ubuntu 24.04)

This bundle installs Sentinel as a LAN appliance using Docker Compose v2 and GHCR version-tagged images.

## What gets deployed

- Caddy reverse proxy on `80:80` (only published service)
- Backend API on internal Docker network (`3000`)
- Frontend Next runtime on internal Docker network (`3001`)
- PostgreSQL with persistent volume
- Optional observability profile (`obs`): Loki, Prometheus, Promtail, Grafana

Canonical public routes:

- `/` -> frontend
- `/api/*` -> backend (prefix preserved)
- `/socket.io*` -> backend (path preserved)
- `/healthz` -> backend `/health`

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
cp .env.example .env
# edit .env and set secrets/passwords before install
nano .env

./install.sh --version vX.Y.Z
```

If operators will browse by IP (`http://<server-ip>`), ensure `CORS_ORIGIN` in `.env` includes both hostname and IP origins, for example:

```env
CORS_ORIGIN=http://sentinel.local,http://192.168.1.50,http://localhost,http://127.0.0.1
```

`install.sh` and `update.sh` also auto-append the detected server IP to `CORS_ORIGIN` as a safeguard.

Optional flags:

- `--lan-cidr 192.168.0.0/16` override detected LAN subnet
- `--with-obs` enable observability profile
- `--allow-grafana-lan` publish Grafana on `3002` (only with `--with-obs`)
- `--no-firewall` skip UFW LAN-only rule setup

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

Custom output path:

```bash
./backup.sh --output /opt/sentinel/backups/manual.dump
```

## Restore

```bash
cd /opt/sentinel/deploy
./restore.sh --file /opt/sentinel/backups/sentinel_YYYYMMDD_HHMMSS.dump
```

Non-interactive restore:

```bash
./restore.sh --file /opt/sentinel/backups/file.dump --yes
```

## Service management

Installed systemd unit:

```bash
sudo systemctl status sentinel-appliance.service
sudo systemctl restart sentinel-appliance.service
```

## URLs after install

- mDNS (best effort): `http://sentinel.local`
- LAN fallback: `http://<server-ip>`

## Health check

```bash
curl -f http://127.0.0.1/healthz
```

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
- Fresh install now forces bootstrap mode to create all tables first and keep them empty:
  - `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma db push"`
  - `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database prisma:baseline"`
- Installer/update/rollback then enforce the bootstrap account and protections:
  - `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/backend sentinel:bootstrap-account"`
- If `_prisma_migrations` contains failed rows, installer auto-resolves them as rolled back before bootstrapping/baselining.
- Installer/update then verifies migration status:
  `docker compose exec -T backend sh -lc "cd /app && pnpm --filter @sentinel/database exec prisma migrate status"`
- Installer/update then verifies schema parity with migration files:
  `docker compose exec -T backend sh -lc 'cd /app && pnpm --filter @sentinel/database exec prisma migrate diff --from-migrations prisma/migrations --to-url "$DATABASE_URL" --exit-code'`
