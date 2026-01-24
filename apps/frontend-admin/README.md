# Sentinel Frontend Admin Dashboard

Next.js 15 admin dashboard for the Sentinel RFID attendance tracking system at HMCS Chippawa.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI Library:** Shadcn/ui with Tweakcn theme
- **State Management:**
  - TanStack Query v5 (server state)
  - Zustand (UI state)
- **API Client:** ts-rest with type-safe contracts from `@sentinel/contracts`
- **Forms:** React Hook Form + Valibot
- **Real-Time:** socket.io-client
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React

## Prerequisites

- Node.js 24.x
- pnpm 10.x
- Backend API running on `localhost:3000`

## Getting Started

### Install Dependencies

From the project root:

```bash
pnpm install
```

### Environment Variables

Create `.env.local` in this directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
NEXT_PUBLIC_APP_PORT=3001
```

### Development Server

**Recommended: Run both backend and frontend together**

From project root:

```bash
pnpm dev:all
```

This starts both services with color-coded output (cyan for backend, magenta for frontend).

**Or run frontend only** (requires backend running separately):

```bash
# From this directory
pnpm dev

# Or from project root
pnpm --filter frontend-admin dev
# Or use the shortcut
pnpm dev:frontend
```

The app will be available at [http://localhost:3001](http://localhost:3001)

**Backend API must be running** on port 3000 for the frontend to function properly.

### Build

```bash
pnpm build
```

### Type Check

```bash
pnpm type-check
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home (redirects to /dashboard)
│   ├── login/             # Badge + PIN login
│   └── dashboard/         # Dashboard page
├── components/
│   ├── ui/                # Shadcn/ui components
│   ├── auth/              # Auth-related components
│   ├── layout/            # Layout components (nav, shell)
│   ├── dashboard/         # Dashboard widgets (Phase 2)
│   ├── members/           # Members page components (Phase 3)
│   └── checkins/          # Check-ins page components (Phase 4)
├── lib/
│   ├── api-client.ts      # ts-rest API client
│   ├── query-client.ts    # TanStack Query config
│   ├── websocket.ts       # WebSocket manager
│   └── utils.ts           # Utility functions (cn, etc.)
├── hooks/                  # Custom React hooks
├── store/                  # Zustand stores
│   ├── auth-store.ts      # Authentication state
│   └── ui-store.ts        # UI state (modals, etc.)
└── types/                  # TypeScript type definitions
```

## Current Status

**Phase 1: Core Infrastructure** ✅ **COMPLETE** (2026-01-23)

- [x] Next.js 15 app with TypeScript and Tailwind CSS 4
- [x] Shadcn/ui components with Tweakcn theme (OKLCH colors, Roboto fonts)
- [x] State management (TanStack Query v5, Zustand with persist)
- [x] API client with ts-rest (@sentinel/contracts)
- [x] WebSocket manager (Socket.io-client with auto-reconnect)
- [x] Badge + PIN login page components
- [x] Top navigation and layout components
- [x] Process manager (`pnpm dev:all` with concurrently)
- [x] Automatic port cleanup script (handles Docker conflicts)
- [x] Backend environment configuration with secrets

**Phase 2: Dashboard Page** 🚧 **TODO**

- [ ] Presence stats widget
- [ ] Security alerts widget
- [ ] Recent check-ins feed widget
- [ ] Quick actions + DDS status widget

**Phase 3: Members Page** 🚧 **TODO**

- [ ] Members table with pagination
- [ ] Member filters
- [ ] Create/Edit/Delete member forms

**Phase 4: Check-ins Page** 🚧 **TODO**

- [ ] Check-ins log table
- [ ] Check-ins filters
- [ ] Manual check-in creation (admin-only)

## Authentication

The app uses a two-step Badge + PIN authentication flow:

1. **Badge Scan:** User scans their RFID badge (or enters serial manually)
2. **PIN Entry:** User enters their 4-6 digit PIN

This ATM-style flow provides better security than simple username/password.

## API Integration

The frontend consumes the backend API via:

- **Type-safe REST calls:** Using `@sentinel/contracts` ts-rest client
- **Real-time updates:** WebSocket subscriptions to channels:
  - `presence` - Presence statistics
  - `checkins` - Check-in/out events
  - `alerts` - Security alerts (admin-only)
  - `dds` - DDS status updates

## Theme

The app uses the **Tweakcn theme** with modern design features:

- **Color System:** OKLCH color space for perceptually uniform colors
- **Typography:** Roboto font family (Sans, Mono, Slab)
- **Border Radius:** 1.3rem (~21px) for rounded corners
- **Shadows:** Custom shadow system with configurable offsets
- **Dark Mode:** Full dark theme support included

To reinstall the theme:

```bash
pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/cmkrca83o000204jifird32xf
```

## Process Manager

The monorepo includes scripts for running both backend and frontend together:

- **`pnpm dev:all`** - Automatically stops Docker containers, kills processes on ports 3000/3001, then starts both services
- **`pnpm dev:backend`** - Run backend only (port 3000)
- **`pnpm dev:frontend`** - Run frontend only (port 3001)
- **`pnpm cleanup`** - Manually cleanup ports without starting services

The cleanup script (`scripts/cleanup-ports.sh`) handles:

- Stopping Docker `sentinel-backend` container if running
- Killing any processes on port 3000 (backend)
- Killing any processes on port 3001 (frontend)

## Development Guidelines

- **TypeScript strict mode** - No `any` types allowed
- **Component structure** - Use Shadcn/ui components as base, add `shadow-sm` for cards
- **State management:**
  - Server state → TanStack Query
  - UI state → Zustand stores
- **Forms** - React Hook Form with Valibot validation
- **Styling** - Tailwind CSS utility classes (use theme colors: `bg-card`, `text-muted-foreground`, etc.)
- **Desktop-first** - Minimum 1280px width (mobile later)

## Related Documentation

- [Implementation Plan](../../docs/plans/active/2026-01-23-frontend-admin-mvp.md)
- [Backend API Documentation](../backend/README.md)
- [Contracts Package](../../packages/contracts/README.md)

## License

Private - HMCS Chippawa Internal Use Only
