# Wiki Kroki Setup

Sentinel uses a self-hosted Kroki service for Wiki.js diagram rendering.

## Overview

- Wiki.js already supports the `markdownKroki` renderer.
- Sentinel runs Kroki as an internal Docker service.
- Wiki.js should target `http://kroki:8000` inside the appliance network.
- Kroki is not exposed on a host or LAN port by default.

## Deployment Wiring

Deployment files:

- `deploy/docker-compose.yml`
- `deploy/.env.example`
- `deploy/_common.sh`

Relevant defaults:

- `KROKI_IMAGE_TAG=0.30.0`
- `KROKI_SERVER_URL=http://kroki:8000`

## Configure Wiki.js Renderer

Run from repo root:

```bash
pnpm wiki:configure:kroki
```

Dry run:

```bash
pnpm wiki:configure:kroki:dry
```

Override server target:

```bash
node scripts/wiki/configure-kroki.mjs --server http://kroki:8000
```

The script:

1. Queries Wiki.js renderers through GraphQL.
2. Finds `markdownKroki`.
3. Enables it.
4. Sets the renderer `server` field to the configured Kroki URL.

## Markdown Usage

Use the Wiki.js Kroki fence syntax:

````md
```kroki
mermaid
graph TD
  A[Start] --> B[Check Alerts]
  B --> C[Verify DDS Status]
```
````

Notes:

- The first line after ` ```kroki ` is the diagram type in lowercase.
- The default Sentinel target renders SVG output through Kroki.

## Operational Notes

- Self-hosting Kroki keeps internal diagram source text off public rendering services.
- The base `yuzutech/kroki` image is sufficient for a minimal install; companion containers are optional.

## Verification

After deploying and configuring:

1. Confirm `sentinel-kroki` is running in Docker Compose.
2. Confirm Wiki.js rendering config shows Kroki enabled.
3. Publish a test page with a small Kroki diagram fence.
4. Verify the diagram renders in Wiki.js without external network dependency.
