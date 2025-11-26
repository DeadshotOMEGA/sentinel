# Sentinel Admin Dashboard

React-based administration interface for the Sentinel RFID attendance system.

## Features

- Member management (CRUD, bulk import)
- Real-time presence monitoring
- Visitor tracking
- Reports with CSV export
- Event management
- Settings for divisions and badges

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open http://localhost:5173

## Tech Stack

- **React 18** with TypeScript
- **Vite** - Fast build tool
- **HeroUI** - Component library with Tailwind
- **React Router** - Client-side routing
- **Zustand** - State management
- **TanStack Query** - Server state management
- **Axios** - HTTP client
- **Socket.IO** - Real-time updates

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── AddAttendeeModal.tsx
│   │   ├── BadgeAssignmentModal.tsx
│   │   ├── EventModal.tsx
│   │   ├── MemberModal.tsx
│   │   ├── PageWrapper.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── hooks/          # Custom hooks
│   │   ├── useAuth.ts      # Authentication state
│   │   └── useSocket.ts    # WebSocket connection
│   ├── layouts/        # Page layouts
│   │   └── DashboardLayout.tsx
│   ├── lib/            # Utilities
│   │   └── api.ts          # Axios client
│   ├── pages/          # Route page components
│   │   ├── Dashboard.tsx
│   │   ├── EventDetail.tsx
│   │   ├── EventMonitor.tsx
│   │   ├── Events.tsx
│   │   ├── Login.tsx
│   │   ├── Members.tsx
│   │   ├── Reports.tsx
│   │   ├── Settings.tsx
│   │   └── Visitors.tsx
│   ├── styles/         # Global CSS
│   ├── App.tsx         # Main app with routing
│   └── main.tsx        # Entry point
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tailwind.config.ts  # Tailwind + HeroUI theme
└── tsconfig.json       # TypeScript config
```

## Pages

### Dashboard
- Presence summary cards (Present, Absent, Visitors)
- Recent activity feed
- Real-time WebSocket updates

### Members
- Searchable/filterable table
- Create/edit member modal
- Badge assignment
- Division assignment

### Visitors
- Active visitors tab
- History tab
- Sign-in modal
- Sign-out action

### Reports
- Current presence report
- CSV export
- Division filter

### Events
- Event list with status tabs
- Create/edit event
- Attendee management
- Badge assignment workflow

### Event Monitor
- Real-time presence stats
- Live activity feed
- Attendee list with status

### Settings
- Division management
- Badge management

## Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

## Scripts

```bash
# Development server
bun run dev

# Production build
bun run build

# Type checking
bun run tsc --noEmit

# Preview production build
bun run preview
```

## Authentication

Uses Zustand with persist middleware. Token stored in localStorage as `sentinel-auth`.

### Auth Flow

1. Login with username/password → JWT token
2. Token added to all API requests via Axios interceptor
3. 401 responses trigger automatic logout

## State Management

- **Zustand**: Client state (auth, UI)
- **TanStack Query**: Server state (data fetching, caching)

## Real-Time Updates

WebSocket connection managed via `useSocket` hook:
- Auto-connects on dashboard mount
- Subscribes to `presence_update` events
- Updates React Query cache on events
- Auto-reconnects on disconnect

## Design System

- **Light mode only** - No dark theme
- **Primary color**: #007fff (Azure Blue)
- **Accent color**: #ff8000 (Orange)
- **Font**: Inter (sans-serif)
- **WCAG AA compliant** - 4.5:1 minimum contrast

## Notes

- Use `bun` not `npm` (better WSL2 performance)
- Never use `any` type - look up actual types
- Share types via `/shared/types/index.ts`
- Touch targets minimum 48px
