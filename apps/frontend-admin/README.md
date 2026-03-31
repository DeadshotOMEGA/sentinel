# Sentinel Frontend Admin

Frontend Admin is the operational web interface for Sentinel, including dashboard workflows, member/history/event/schedule management, DDS workflows, and kiosk mode.

## Current Status (v2.1.0)

- Phase 1: Core frontend foundation - complete
- Phase 2: Dashboard and live status UX - complete
- Phase 3: Member/history/event/schedule workflows - complete
- Phase 4: DDS + lockup operational workflows - complete
- Phase 5: Kiosk operations and visitor self-sign-in - complete

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4 + DaisyUI 5
- TanStack Query 5 + Zustand
- ts-rest React Query client from `@sentinel/contracts`
- Socket.IO client for real-time updates

## Routes and Areas

- `/dashboard` - Presence, alerts, quick actions, system status, DDS controls
- `/checkins` - History and check-in operations
- `/members` - Member records and badge operations
- `/events` - Event management
- `/schedules` - Schedule and duty-watch planning
- `/dds` - DDS checklist and handover-focused workflows
- `/kiosk` - Touch-first kiosk mode
- `/badges`, `/database`, `/settings`, `/logs` - Admin and support tooling

## Kiosk (Current)

Kiosk mode is implemented in this app at `/kiosk` and includes:

- Fullscreen-first kiosk shell behavior
- Hidden maintenance exit controls for supervised recovery
- Badge-driven command deck flow
- DDS responsibility prompts and lockup/open-building actions
- Visitor self-sign-in flow
- Touch-focused UI behavior and keyboard support

## Local Development

### Prerequisites

- Node.js 24.x
- pnpm 10.x
- Backend API on `localhost:3000`

### Install

From repo root:

```bash
pnpm install
```

### Environment

Create `.env.local` in `apps/frontend-admin`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
NEXT_PUBLIC_APP_PORT=3001
NEXT_PUBLIC_WIKI_BASE_URL=http://localhost:3002
NEXT_PUBLIC_HELP_FALLBACK_MODE=hybrid
NEXT_PUBLIC_HELP_PREVIEW_ENABLED=false
NEXT_PUBLIC_HELP_DOCS_VERSION=latest
```

### Run

Recommended from repo root:

```bash
pnpm dev:all
```

Frontend-only options:

```bash
pnpm --filter frontend-admin dev
# or
pnpm dev:frontend
```

### Validate

```bash
pnpm --filter frontend-admin typecheck
pnpm --filter frontend-admin lint
pnpm --filter frontend-admin build
```

## Project Structure

```text
apps/frontend-admin/src/
├── app/                 # Next.js routes
├── components/          # UI + feature components
├── hooks/               # Data and behavior hooks
├── lib/                 # API client, utils, wiring
├── store/               # Zustand stores
└── types/               # Frontend-specific types
```

## Notes

- Frontend uses DaisyUI-first component styling and conventions.
- Mobile-app roadmap work is not part of the current frontend-admin scope.

## Related Docs

- [Root README](../../README.md)
- [Backend README](../backend/README.md)
- [Deployment README](../../deploy/README_DEPLOY.md)

## License

Private - HMCS Chippawa Internal Use Only
