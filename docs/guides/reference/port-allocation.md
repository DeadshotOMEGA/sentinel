# Sentinel Port Allocation Reference

This document defines the canonical host/LAN port allocation policy for Sentinel services.

## Allocated ranges

| Area                   | Range       | Notes                                          |
| ---------------------- | ----------- | ---------------------------------------------- |
| Backend API            | `3000`      | Primary backend HTTP/API port                  |
| Frontend apps          | `3001-3003` | Admin frontend and future frontend variants    |
| Kiosk (future)         | `3004`      | Reserved for kiosk runtime                     |
| Door Scanners (future) | `3005-3006` | Reserved for scanner gateway/services          |
| Observability          | `3010-3019` | Grafana, Prometheus, Loki, and related tooling |
| Additional Services    | `3020-3029` | Wiki.js and future auxiliary services          |

## Assignment rules

- Do not place new services outside their allocated range.
- Keep deployment docs and compose/env defaults in sync when changing any mapping.
- Prefer explicit environment variables for published ports.
- Treat this file and root `AGENTS.md` as authoritative for future service additions.

## Current deployment defaults

- Grafana LAN publish (optional): `3010`
- Prometheus (local compose profile): `3011`
- Loki (local compose profile): `3012`
- Wiki docs host via Caddy: `80` (`docs.sentinel.local`)
- Wiki.js (recommended when enabled): `3020`
