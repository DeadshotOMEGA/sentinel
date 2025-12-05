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

# Testing (use npx vitest, not bun test)
cd backend && npx vitest run
cd kiosk && npx vitest run
cd frontend && npx vitest run
cd tv-display && npx vitest run

# E2E tests (requires running apps)
npx playwright test tests/e2e/
```

## Hardware Deployment

| System | Hardware | Display |
|--------|----------|---------|
| Backend Server | Raspberry Pi 5 (8GB) | None |
| Primary Entrance Kiosk | Pi 5 + Waveshare PN532 NFC HAT | 10.1" Capacitive Touchscreen |
| Rear Door Scanner | Pi 5 + PN532 NFC HAT | None (audio only) |

## Critical Constraints

- **WCAG AA required** - 4.5:1 contrast ratio minimum
- **Touch targets 48px minimum** - Kiosk uses 56px
- **Reduced animations on Pi** - Use `prefers-reduced-motion` media query
- **Offline-first** - Kiosk operations must work without network
- **Admins are non-technical** - Plain language errors with "how to fix" guidance
- **Never use `any` type** - Look up actual types
- **Throw errors early** - No silent fallbacks

## HeroUI Agent Integration

**MANDATORY**: When creating or editing React component files (`.tsx`/`.jsx`) in `frontend/`, `kiosk/`, or `tv-display/`:

1. **Before implementing UI**, invoke the `heroui-guardian` agent to:
   - Get recommended HeroUI components for the task
   - Look up component props and variants from GitHub source
   - Ensure proper import patterns and prop usage

2. **Use the skill** `/heroui-lookup [component]` to fetch documentation for specific components

3. **The compliance hook** will block saves that violate HeroUI standards:
   - Native HTML where HeroUI equivalent exists
   - Wrong props (`onClick` instead of `onPress`)
   - Hardcoded colors instead of theme tokens

**Agent Location:** `.claude/agents/heroui-guardian.md`
**Skill Location:** `.claude/skills/heroui-lookup.md`
**Hook Location:** `.claude/hooks/post-tool-use/heroui-compliance.py`

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

## CSS Patterns

### Shadow Breathing Room
Scroll containers (`overflow-auto`, `overflow-hidden`) clip HeroUI card shadows. Use the padding + negative margin pattern to give shadows room on all sides:

```tsx
// On any element with overflow-auto or overflow-hidden
className="-mx-1 -my-1 overflow-auto px-1 py-1"

// For HeroUI Table, add to base class
classNames={{
  base: '-mx-1 -my-1 flex-1 overflow-hidden px-1 py-1',
  wrapper: 'max-h-full overflow-auto',
}}

// When bottom padding is already set (e.g., pb-6), use top-only vertical:
className="-mx-1 -mt-1 overflow-auto px-1 pt-1 pb-6"
```

### Layout Structure
- `DashboardLayout` uses `overflow-auto` on `<main>` (not `overflow-hidden`)
- `PageWrapper` provides `p-6` padding but no overflow clipping
- Individual pages handle their own scroll containers with shadow breathing room

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
- **Response format**: Always wrap arrays in named objects - `{ badges: [...] }`, `{ members: [...] }`, never raw arrays. Frontend types must match: `api.get<{ badges: Badge[] }>('/badges')`

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `checkin` | Server→Client | Member check-in/out |
| `presence_update` | Server→Client | Stats update |
| `visitor_signin` | Server→Client | Visitor arrival |
| `event_checkin` | Server→Client | Event attendee check-in |
| `session_expired` | Server→Client | Session expired, client should re-auth |

### WebSocket Authentication
- **JWT token** - Admin users via session cookie
- **Kiosk API key** - `KIOSK_API_KEY` env var
- **Display API key** - `DISPLAY_API_KEY` env var
- Connection rate limiting: 10 conn/IP/min
- Event rate limiting: 100 events/socket/min
- Session expiry monitoring with auto-disconnect

## Health & Monitoring Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/live` | Kubernetes liveness probe |
| `/api/ready` | Kubernetes readiness probe (checks DB + Redis) |
| `/api/health` | Detailed health status |
| `/api/metrics` | Request stats, latencies, error rates, WS connections |

### Observability
- Correlation IDs auto-propagated via AsyncLocalStorage
- Response headers: `x-correlation-id`, `x-request-id`
- Structured JSON logging in production

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
| `backend/src/routes/index.ts` | API route mounting + health endpoints |
| `backend/src/websocket/server.ts` | WebSocket server with auth + rate limiting |
| `backend/src/websocket/rate-limit.ts` | Connection + event rate limiting |
| `backend/src/utils/request-context.ts` | AsyncLocalStorage correlation IDs |
| `backend/src/utils/metrics.ts` | Request/connection metrics |
| `backend/src/services/import-service.ts` | CSV import with transactions |
| `frontend/src/lib/config.ts` | Environment variable loading |
| `kiosk/src/state/kiosk-state.ts` | Kiosk screen state machine |
| `kiosk/src/services/sync-service.ts` | Offline sync logic |
| `kiosk/src/db/queue.ts` | IndexedDB offline queue |

## Test Coverage

| App | Test Location | Coverage |
|-----|---------------|----------|
| backend | `src/**/__tests__/*.test.ts` | Services, WebSocket, import |
| kiosk | `src/**/__tests__/*.test.ts` | Queue, offline sync, services |
| frontend | `src/hooks/__tests__/*.test.ts` | WebSocket hooks |
| tv-display | `src/hooks/__tests__/*.test.ts` | Presence data hooks |
| e2e | `tests/e2e/**/*.spec.ts` | Badge check-in flows |

## Documentation

- `docs/REMAINING-TASKS.md` - Current project status and remaining work
- `docs/implementation-plan.md` - 8-phase implementation plan
- `product-overview.html` - Requirements and user flows
- `design-system/` - Design tokens and component specs
- `feature-events-groups.md` - Events/temporary access spec
