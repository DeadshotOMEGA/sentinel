# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Sentinel** - RFID attendance tracking system for **HMCS Chippawa** (Royal Canadian Navy reserve unit, Winnipeg). Standalone system with no DWAN integration.

## Project Structure

```
sentinel/
├── backend/          # Express API + WebSocket server (Bun)
├── frontend/         # Admin dashboard (React + HeroUI)
├── kiosk/            # Touch check-in interface (React)
├── tv-display/       # Passive wall display (React)
├── hardware/         # NFC daemon for Raspberry Pi
├── shared/           # TypeScript types shared across apps
└── docs/             # Implementation plan and specs
```

## Quick Commands

```bash
# All apps use Bun (not npm)
cd backend && bun install && bun run dev
cd frontend && bun install && bun run dev
cd kiosk && bun install && bun run dev
cd tv-display && bun install && bun run dev

# Type checking
cd <app> && bun run tsc --noEmit

# Database
cd backend && bun run db/migrate.ts
cd backend && bun run db/seed.ts
```

## Hardware Deployment

| System | Hardware | Display |
|--------|----------|---------|
| Backend Server | Raspberry Pi 5 (8GB) | None |
| Primary Entrance Kiosk | Pi 5 + Waveshare PN532 NFC HAT | 10.1" Capacitive Touchscreen |
| Rear Door Scanner | Pi 5 + PN532 NFC HAT | None (audio only) |

## Critical Constraints

- **Light mode only** - No dark theme implementation
- **WCAG AA required** - 4.5:1 contrast ratio minimum
- **Touch targets 48px minimum** - Kiosk uses 56px
- **Reduced animations on Pi** - Use `prefers-reduced-motion` media query
- **Offline-first** - Kiosk operations must work without network
- **Admins are non-technical** - Plain language errors with "how to fix" guidance
- **Never use `any` type** - Look up actual types
- **Throw errors early** - No silent fallbacks

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Backend | Express + Socket.IO |
| Database | PostgreSQL |
| Cache/Sessions | Redis |
| Frontend | React + TypeScript + Vite |
| UI Library | HeroUI (Tailwind-based) |
| State | Zustand (client), React Query (server) |
| Offline Storage | IndexedDB (kiosk) |

## Member Classifications

Three distinct types - never mix in queries:
1. **Full-Time Staff** - Class B/C personnel
2. **Reserve Members** - Class A personnel
3. **Event Attendees** - Temporary access tied to events (separate data model)

## Design Tokens

```
Primary: #007fff (Azure Blue)
Accent:  #ff8000 (Orange)
Success: #10b981 (Green)
Font:    Inter
```

## UI Mode Classes

```css
.kiosk-mode  /* 56px touch targets, larger fonts */
.tv-mode     /* Wall display, no hover states, cursor: default */
```

## Interface-Specific Rules

| Interface | HeroUI Pro | Custom Components |
|-----------|------------|-------------------|
| Admin Dashboard | Full Pro suite | Minimal |
| Kiosk | Base primitives | All layouts |
| TV Display | KPI Stats (enlarged) | All layouts |
| Rear Door | None | Audio feedback |

## API Patterns

All API routes use:
- Zod validation for inputs
- Custom error classes (NotFoundError, ValidationError, ConflictError)
- `requireAuth` middleware for protected routes
- `requireRole('admin')` for admin-only operations
- toCamelCase/toSnakeCase for DB row conversion

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `checkin` | Server→Client | Member check-in/out |
| `presence_update` | Server→Client | Stats update |
| `visitor_signin` | Server→Client | Visitor arrival |
| `event_checkin` | Server→Client | Event attendee check-in |

## Offline Sync (Kiosk)

1. Check-ins stored in IndexedDB when offline
2. Network status detected via `navigator.onLine` + health ping
3. Auto-sync on reconnection with exponential backoff
4. Bulk upload endpoint `/api/checkins/bulk`
5. Timestamp validation (reject >7 days old, future timestamps)

## Key Files

| File | Purpose |
|------|---------|
| `shared/types/index.ts` | All TypeScript interfaces |
| `backend/src/routes/index.ts` | API route mounting |
| `backend/src/websocket/broadcast.ts` | Real-time event broadcasting |
| `kiosk/src/state/kiosk-state.ts` | Kiosk screen state machine |
| `kiosk/src/services/sync-service.ts` | Offline sync logic |

## Documentation

- `docs/implementation-plan.md` - 8-phase implementation plan
- `product-overview.html` - Requirements and user flows
- `design-system/` - Design tokens and component specs
- `feature-events-groups.md` - Events/temporary access spec
