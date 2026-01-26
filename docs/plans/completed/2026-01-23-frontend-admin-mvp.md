# Implementation Plan: Sentinel Frontend Admin Dashboard

## Executive Summary

**Objective:** Build a Next.js 15 admin dashboard for Sentinel RFID attendance system with Badge + PIN authentication, real-time updates, and desktop-optimized UX.

**MVP Scope:** Dashboard + Members + Check-ins pages

**Current Status:** ✅ **ALL PHASES COMPLETE** - MVP frontend admin dashboard fully implemented (2026-01-26)

**Key Decisions:**

- ✅ UI Framework: Shadcn/ui with Tweakcn theme (OKLCH colors, Roboto fonts)
- ✅ State Management: Zustand for UI state, TanStack Query for server state
- ✅ Authentication: Badge auto-submit + PIN (ATM-style two-step flow)
- ✅ API Client: ts-rest from `@sentinel/contracts` package
- ✅ Forms: React Hook Form + Valibot (reuse backend schemas)
- ✅ Testing: Minimal for MVP (defer comprehensive testing to post-MVP)
- ✅ Responsive: Desktop-only (minimum 1280px width)
- ✅ Process Manager: Concurrently for running backend + frontend together
- ✅ Port Management: Automatic cleanup of ports 3000 & 3001 on startup

---

## Implementation Status

### ✅ Phase 1: Core Infrastructure - COMPLETE (2026-01-23)

**Completed:**

1. ✅ Next.js 15 app initialized with TypeScript, Tailwind CSS 4, and App Router
2. ✅ Shadcn/ui components installed with Tweakcn theme
   - OKLCH color space for better color perception
   - Roboto font family (Sans, Mono, Slab) from Google Fonts
   - 1.3rem border radius, custom shadow system
   - Dark mode support included
3. ✅ TanStack Query v5 configured for server state
4. ✅ Zustand stores created (auth-store, ui-store)
5. ✅ ts-rest API client configured with @sentinel/contracts
6. ✅ WebSocket manager created with Socket.io-client
7. ✅ Badge + PIN login page components
8. ✅ Top navigation with user menu
9. ✅ Page shell layout component
10. ✅ Dashboard page with placeholder widgets
11. ✅ Process manager (concurrently) for dev:all script
12. ✅ Port cleanup script for Docker conflicts
13. ✅ Backend .env configuration with database credentials and secrets
14. ✅ All workspace dependencies linked (@sentinel/contracts, @sentinel/types)

**Key Files Created:**

- `apps/frontend-admin/src/lib/api-client.ts` - ts-rest client
- `apps/frontend-admin/src/lib/query-client.ts` - TanStack Query config
- `apps/frontend-admin/src/lib/websocket.ts` - Socket.io manager
- `apps/frontend-admin/src/store/auth-store.ts` - Zustand auth state
- `apps/frontend-admin/src/store/ui-store.ts` - Zustand UI state
- `apps/frontend-admin/src/components/auth/badge-scan-input.tsx`
- `apps/frontend-admin/src/components/auth/pin-input.tsx`
- `apps/frontend-admin/src/components/layout/top-nav.tsx`
- `apps/frontend-admin/src/components/layout/user-menu.tsx`
- `apps/frontend-admin/src/components/layout/page-shell.tsx`
- `apps/frontend-admin/src/app/login/page.tsx`
- `apps/frontend-admin/src/app/dashboard/page.tsx`
- `apps/frontend-admin/.env.local` - Environment variables
- `apps/backend/.env` - Backend configuration
- `scripts/cleanup-ports.sh` - Port management script

**Scripts Added:**

- `pnpm dev:all` - Run both backend and frontend with automatic port cleanup
- `pnpm dev:backend` - Run backend only
- `pnpm dev:frontend` - Run frontend only
- `pnpm cleanup` - Manually cleanup ports

**Infrastructure:**

- Backend: Port 3000
- Frontend: Port 3001
- Grafana: Port 3002 (moved from 3001 to avoid conflicts)
- Database: PostgreSQL on localhost:5432 (Docker)
- Credentials: `sentinel:sentinel@localhost:5432/sentinel`

### ✅ Phase 2: Dashboard Page - COMPLETE (2026-01-26)

**Completed:**

- ✅ Presence stats widget with real data
- ✅ Security alerts widget with real-time updates
- ✅ Recent check-ins feed with WebSocket subscriptions
- ✅ Quick actions + DDS status widget
- ✅ Additional widgets: Recent actions sidebar

**Key Files Created:**

- `apps/frontend-admin/src/components/dashboard/presence-stats-widget.tsx`
- `apps/frontend-admin/src/components/dashboard/security-alerts-bar.tsx`
- `apps/frontend-admin/src/components/dashboard/checkins-feed-widget.tsx`
- `apps/frontend-admin/src/components/dashboard/quick-action-buttons.tsx`
- `apps/frontend-admin/src/components/dashboard/dds-status-widget.tsx`
- `apps/frontend-admin/src/components/dashboard/recent-actions-sidebar.tsx`

### ✅ Phase 3: Members Page - COMPLETE (2026-01-23)

**Completed:**

- ✅ Members table with TanStack Table
- ✅ Members filters (division, rank, status, search)
- ✅ Create member form with React Hook Form + Valibot
- ✅ Edit member functionality
- ✅ Delete member with confirmation dialog
- ✅ Server-side pagination

**Key Files Created:**

- `apps/frontend-admin/src/app/members/page.tsx`
- `apps/frontend-admin/src/components/members/members-table.tsx`
- `apps/frontend-admin/src/components/members/members-filters.tsx`
- `apps/frontend-admin/src/components/members/member-form-modal.tsx`
- `apps/frontend-admin/src/components/members/delete-member-dialog.tsx`

### ✅ Phase 4: Check-ins Page - COMPLETE (2026-01-23)

**Completed:**

- ✅ Check-ins table with TanStack Table
- ✅ Check-ins filters (date range, direction, member, division)
- ✅ Manual check-in modal (admin-only)
- ✅ Server-side pagination
- ✅ Real-time updates integration

**Key Files Created:**

- `apps/frontend-admin/src/app/checkins/page.tsx`
- `apps/frontend-admin/src/components/checkins/checkins-table.tsx`
- `apps/frontend-admin/src/components/checkins/checkins-filters.tsx`
- `apps/frontend-admin/src/components/checkins/manual-checkin-modal.tsx`

---

## Technology Stack

### Core Framework

- **Next.js 15** (App Router)
- **React 19** (Server Components where applicable)
- **TypeScript** (strict mode)
- **pnpm** (package manager)
- **Node.js 24.x**

### UI & Styling

- **Shadcn/ui** - Copy-paste components (Radix UI primitives)
- **Tweakcn Theme** - OKLCH color space, Roboto fonts, 1.3rem radius
  - Theme URL: `https://tweakcn.com/r/themes/cmkrca83o000204jifird32xf`
  - Google Fonts: Roboto, Roboto Mono, Roboto Slab
  - Custom shadow system with configurable offsets
- **Tailwind CSS 4** - Utility-first styling with `@theme inline`
- **Lucide React** - Icon library (tree-shakeable)
- **clsx + tailwind-merge** - Conditional class names via `cn()` utility

### Data Management

- **TanStack Query v5** - Server state caching, mutations
- **Zustand** - UI state (modals, filters, user preferences)
- **ts-rest client** - Type-safe API calls from `@sentinel/contracts`

### Forms & Validation

- **React Hook Form** - Form state management
- **Valibot** - Schema validation (reuse backend schemas)

### Real-Time

- **socket.io-client** - WebSocket subscriptions (4 channels: presence, checkins, alerts, dds)

### Tables & Data Display

- **TanStack Table v8** - Server-side pagination, sorting, filtering
- No charts for MVP (chip-style number stats only)

### Development Tools

- **ESLint** - Linting (extend backend config)
- **Prettier** - Code formatting
- **Vitest + React Testing Library** - Minimal smoke tests only for MVP
- **TypeScript path aliases** - `@sentinel/contracts`, `@sentinel/types`, `@/components`, etc.

---

## MVP Feature Scope

### Phase 1: Core Infrastructure (Foundation)

1. **Project Setup**
   - Next.js 15 app with App Router
   - Shadcn/ui installation and configuration
   - TypeScript strict mode, path aliases
   - Environment variables (API URLs, ports)
   - Monorepo integration with shared packages

2. **Authentication System**
   - Badge + PIN login page (two-step flow)
   - RFID badge scan detection (WebSocket or polling)
   - PIN entry after badge auto-submit
   - Session management (better-auth integration)
   - Auto-redirect to login on 401
   - Logout functionality

3. **Layout & Navigation**
   - Top navigation bar (horizontal)
   - User menu (display name, role, logout)
   - Navigation links (Dashboard, Members, Check-ins)
   - Role-based hiding of unauthorized nav items

4. **API Client Setup**
   - ts-rest client initialization from `@sentinel/contracts`
   - TanStack Query configuration (cache times, defaults)
   - Error interceptors (toast notifications)
   - Loading state handling

5. **WebSocket Integration**
   - socket.io-client connection manager
   - Subscribe to 4 channels: `presence`, `checkins`, `alerts`, `dds`
   - Auto-reconnect logic
   - Connection status indicator (optional)

### Phase 2: Dashboard Page

6. **Dashboard Layout**
   - Page shell with 4-widget grid
   - Responsive grid (desktop-only, min 1280px)

7. **Presence Stats Widget**
   - Display total members currently present
   - Chip-style number display (simple, no absent count)
   - Real-time updates via `presence` WebSocket subscription
   - TanStack Query for initial data fetch

8. **Security Alerts Widget**
   - List of unacknowledged security alerts
   - Alert type badges (badge_disabled, badge_unknown, etc.)
   - Severity indicators (critical, warning, info)
   - Real-time updates via `alerts` WebSocket subscription
   - Click to acknowledge (admin-only)

9. **Recent Check-ins Feed**
   - Last 10-20 check-in/out events
   - Show: member name, direction (in/out), timestamp, kiosk ID
   - Real-time updates via `checkins` WebSocket subscription
   - Auto-scroll or badge notification on new events

10. **Quick Actions + DDS Status Widget**
    - Quick action buttons:
      - Manual check-in
      - Visitor sign-in (link to future page)
      - Reports (link to future page)
      - Execute lockup (admin-only)
    - DDS status display:
      - Show today's DDS member name
      - Status indicator (pending/accepted/transferred/released)
      - Real-time updates via `dds` WebSocket subscription

### Phase 3: Members Page

11. **Members List Table**
    - TanStack Table with server-side pagination
    - Columns: Service #, Name, Rank, Division, Status, Badge, Actions
    - Pagination controls (page size: 25/50/100)
    - Loading skeletons

12. **Members Filtering**
    - Filter by division (dropdown)
    - Filter by rank (dropdown)
    - Filter by status (active/inactive)
    - Search by name or service number (debounced)
    - Clear filters button

13. **Member Actions**
    - View details (navigate to detail page or modal)
    - Edit member (modal with form)
    - Delete member (confirmation dialog)
    - Role-based action hiding (hide for unauthorized users)

14. **Create Member Form**
    - Modal with React Hook Form
    - Fields: serviceNumber, rank, firstName, lastName, email, phone, division, memberType, memberStatus
    - Valibot validation (reuse backend schema from `@sentinel/contracts`)
    - TanStack Query mutation for POST
    - Optimistic update (optional)

### Phase 4: Check-ins Page

15. **Check-ins Log Table**
    - TanStack Table with server-side pagination
    - Columns: Timestamp, Member Name, Direction (in/out), Badge Serial, Kiosk ID, Method
    - Pagination controls
    - Loading skeletons

16. **Check-ins Filtering**
    - Filter by date range (date picker)
    - Filter by direction (in/out/all)
    - Filter by member (autocomplete)
    - Filter by division
    - Clear filters button

17. **Manual Check-in Creation**
    - Button to open modal
    - Form: Select member, Select direction, Optional notes
    - Admin-only feature (hidden for other roles)
    - TanStack Query mutation for POST

---

## Project Structure

```
sentinel/
├── apps/
│   ├── backend/                    # Existing Express API
│   └── frontend-admin/             # NEW: Next.js admin dashboard
│       ├── .env.local              # Environment variables (gitignored)
│       ├── .eslintrc.json          # ESLint config (extend backend)
│       ├── next.config.ts          # Next.js configuration
│       ├── package.json            # Dependencies
│       ├── tsconfig.json           # TypeScript config (strict mode)
│       ├── tailwind.config.ts      # Tailwind CSS config
│       ├── components.json         # Shadcn/ui config
│       ├── public/                 # Static assets
│       ├── src/
│       │   ├── app/                # Next.js App Router
│       │   │   ├── layout.tsx      # Root layout (providers)
│       │   │   ├── page.tsx        # Home redirect to /dashboard
│       │   │   ├── login/
│       │   │   │   └── page.tsx    # Login page (Badge + PIN)
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx    # Dashboard with 4 widgets
│       │   │   ├── members/
│       │   │   │   ├── page.tsx    # Members list table
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx# Member detail (optional)
│       │   │   ├── checkins/
│       │   │   │   └── page.tsx    # Check-ins log table
│       │   │   └── api/            # API routes (if needed for proxying)
│       │   ├── components/
│       │   │   ├── ui/             # Shadcn/ui components (button, card, table, etc.)
│       │   │   ├── layout/
│       │   │   │   ├── top-nav.tsx # Top navigation bar
│       │   │   │   ├── user-menu.tsx# User menu dropdown
│       │   │   │   └── page-shell.tsx# Reusable page wrapper
│       │   │   ├── dashboard/
│       │   │   │   ├── presence-stats-widget.tsx
│       │   │   │   ├── security-alerts-widget.tsx
│       │   │   │   ├── checkins-feed-widget.tsx
│       │   │   │   └── quick-actions-widget.tsx
│       │   │   ├── members/
│       │   │   │   ├── members-table.tsx
│       │   │   │   ├── members-filters.tsx
│       │   │   │   ├── member-form-modal.tsx
│       │   │   │   └── delete-member-dialog.tsx
│       │   │   ├── checkins/
│       │   │   │   ├── checkins-table.tsx
│       │   │   │   ├── checkins-filters.tsx
│       │   │   │   └── manual-checkin-modal.tsx
│       │   │   └── auth/
│       │   │       ├── badge-scan-input.tsx
│       │   │       ├── pin-input.tsx
│       │   │       └── login-form.tsx
│       │   ├── lib/
│       │   │   ├── api-client.ts   # ts-rest client setup
│       │   │   ├── websocket.ts    # socket.io-client manager
│       │   │   ├── query-client.ts # TanStack Query config
│       │   │   ├── utils.ts        # cn() helper, etc.
│       │   │   └── constants.ts    # App constants (page sizes, etc.)
│       │   ├── hooks/
│       │   │   ├── use-auth.ts     # Authentication hook
│       │   │   ├── use-websocket.ts# WebSocket subscription hook
│       │   │   ├── use-members.ts  # Members query hooks
│       │   │   ├── use-checkins.ts # Check-ins query hooks
│       │   │   └── use-presence.ts # Presence query hooks
│       │   ├── store/
│       │   │   ├── auth-store.ts   # Zustand auth state
│       │   │   ├── ui-store.ts     # Zustand UI state (modals, etc.)
│       │   │   └── websocket-store.ts# Zustand WebSocket connection state
│       │   └── types/
│       │       ├── api.ts          # Re-export from @sentinel/contracts
│       │       └── ui.ts           # UI-specific types
│       └── README.md               # Frontend setup instructions
├── packages/
│   ├── contracts/                  # Existing ts-rest contracts
│   ├── database/                   # Existing Prisma client
│   └── types/                      # Existing shared types
└── docker-compose.yml              # Add frontend-admin service
```

---

## Implementation Phases (Step-by-Step)

### Phase 1: Project Setup & Authentication (Days 1-3)

#### Task 1.1: Initialize Next.js App

```bash
# From /home/sauk/projects/sentinel/
cd apps/
npx create-next-app@latest frontend-admin \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

# Move src directory to proper location
cd frontend-admin
mkdir src
mv app src/
```

#### Task 1.2: Install Dependencies

```bash
cd apps/frontend-admin

# UI & Styling
pnpm add shadcn-ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input label form table dialog dropdown-menu

# State Management
pnpm add @tanstack/react-query zustand
pnpm add @tanstack/react-query-devtools -D

# API & Forms
pnpm add @ts-rest/core @ts-rest/react-query
pnpm add react-hook-form @hookform/resolvers valibot

# WebSocket
pnpm add socket.io-client

# Utils
pnpm add clsx tailwind-merge lucide-react

# Workspace packages
# These are already in pnpm-workspace.yaml, so just reference in package.json
# "@sentinel/contracts": "workspace:*"
# "@sentinel/types": "workspace:*"
```

#### Task 1.3: Configure TypeScript & Path Aliases

**File:** `apps/frontend-admin/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@sentinel/contracts": ["../../packages/contracts/src"],
      "@sentinel/types": ["../../packages/types/src"],
      "@sentinel/database": ["../../packages/database/src"]
    }
  }
}
```

#### Task 1.4: Environment Configuration

**File:** `apps/frontend-admin/.env.local` (gitignored)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
NEXT_PUBLIC_APP_PORT=3001
```

**File:** `apps/frontend-admin/next.config.ts`

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*', // Proxy to backend
      },
    ]
  },
}

export default nextConfig
```

#### Task 1.5: Update package.json Scripts

**File:** `apps/frontend-admin/package.json`

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

#### Task 1.6: Setup API Client

**File:** `apps/frontend-admin/src/lib/api-client.ts`

```typescript
import { initClient } from '@ts-rest/core'
import { contract } from '@sentinel/contracts' // Import ts-rest contract

export const apiClient = initClient(contract, {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  baseHeaders: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include cookies for session auth
})
```

#### Task 1.7: Setup TanStack Query

**File:** `apps/frontend-admin/src/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

**File:** `apps/frontend-admin/src/app/layout.tsx`

```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

#### Task 1.8: Setup WebSocket Manager

**File:** `apps/frontend-admin/src/lib/websocket.ts`

```typescript
import { io, Socket } from 'socket.io-client'

class WebSocketManager {
  private socket: Socket | null = null

  connect() {
    if (this.socket?.connected) return

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected:', this.socket?.id)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason)
    })

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error)
    })
  }

  subscribe(channel: string) {
    if (!this.socket) throw new Error('Socket not initialized')
    this.socket.emit(`${channel}:subscribe`)
  }

  unsubscribe(channel: string) {
    if (!this.socket) throw new Error('Socket not initialized')
    this.socket.emit(`${channel}:unsubscribe`)
  }

  on(event: string, handler: (data: any) => void) {
    if (!this.socket) throw new Error('Socket not initialized')
    this.socket.on(event, handler)
  }

  off(event: string, handler?: (data: any) => void) {
    if (!this.socket) throw new Error('Socket not initialized')
    this.socket.off(event, handler)
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
}

export const websocketManager = new WebSocketManager()
```

#### Task 1.9: Setup Zustand Stores

**File:** `apps/frontend-admin/src/store/auth-store.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: 'developer' | 'admin' | 'executive' | 'duty_watch' | 'quartermaster'
  badgeId?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
)
```

**File:** `apps/frontend-admin/src/store/ui-store.ts`

```typescript
import { create } from 'zustand'

interface UIState {
  // Modal states
  isCreateMemberModalOpen: boolean
  isManualCheckinModalOpen: boolean

  // Actions
  openCreateMemberModal: () => void
  closeCreateMemberModal: () => void
  openManualCheckinModal: () => void
  closeManualCheckinModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isCreateMemberModalOpen: false,
  isManualCheckinModalOpen: false,

  openCreateMemberModal: () => set({ isCreateMemberModalOpen: true }),
  closeCreateMemberModal: () => set({ isCreateMemberModalOpen: false }),
  openManualCheckinModal: () => set({ isManualCheckinModalOpen: true }),
  closeManualCheckinModal: () => set({ isManualCheckinModalOpen: false }),
}))
```

#### Task 1.10: Build Login Page (Badge + PIN)

**File:** `apps/frontend-admin/src/app/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeScanInput } from '@/components/auth/badge-scan-input';
import { PinInput } from '@/components/auth/pin-input';
import { useAuthStore } from '@/store/auth-store';

export default function LoginPage() {
  const [step, setStep] = useState<'badge' | 'pin'>('badge');
  const [badgeSerial, setBadgeSerial] = useState<string>('');
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const handleBadgeScan = (serial: string) => {
    setBadgeSerial(serial);
    setStep('pin');
  };

  const handlePinSubmit = async (pin: string) => {
    // Call backend auth endpoint with badge + PIN
    // For now, mock success
    setUser({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      badgeId: badgeSerial,
    });
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          HMCS Chippawa - Sentinel
        </h1>

        {step === 'badge' ? (
          <BadgeScanInput onScan={handleBadgeScan} />
        ) : (
          <PinInput onSubmit={handlePinSubmit} onBack={() => setStep('badge')} />
        )}
      </div>
    </div>
  );
}
```

**File:** `apps/frontend-admin/src/components/auth/badge-scan-input.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface BadgeScanInputProps {
  onScan: (serial: string) => void;
}

export function BadgeScanInput({ onScan }: BadgeScanInputProps) {
  const [serial, setSerial] = useState('');
  const [isListening, setIsListening] = useState(true);

  useEffect(() => {
    if (!isListening) return;

    // Listen for badge scan via WebSocket or keyboard input
    // For MVP, simple input field with auto-submit on Enter
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && serial.length > 0) {
        onScan(serial);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [serial, isListening, onScan]);

  return (
    <div className="space-y-4">
      <Label htmlFor="badge">Scan Your Badge</Label>
      <Input
        id="badge"
        type="text"
        placeholder="Badge serial number"
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
        autoFocus
      />
      <p className="text-sm text-gray-500">
        Place your badge on the reader or enter manually
      </p>
      <Button
        className="w-full"
        onClick={() => serial && onScan(serial)}
        disabled={!serial}
      >
        Continue
      </Button>
    </div>
  );
}
```

**File:** `apps/frontend-admin/src/components/auth/pin-input.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface PinInputProps {
  onSubmit: (pin: string) => void;
  onBack: () => void;
}

export function PinInput({ onSubmit, onBack }: PinInputProps) {
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Label htmlFor="pin">Enter Your PIN</Label>
      <Input
        id="pin"
        type="password"
        placeholder="****"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        maxLength={6}
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" disabled={pin.length < 4} className="flex-1">
          Sign In
        </Button>
      </div>
    </form>
  );
}
```

#### Task 1.11: Build Top Navigation Layout

**File:** `apps/frontend-admin/src/components/layout/top-nav.tsx`

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/members', label: 'Members' },
  { href: '/checkins', label: 'Check-ins' },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold">
              Sentinel
            </Link>

            <div className="flex gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
```

**File:** `apps/frontend-admin/src/components/layout/user-menu.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut } from 'lucide-react';

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <User className="h-4 w-4 mr-2" />
          {user.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="text-xs text-gray-500">Signed in as</div>
          <div className="font-semibold">{user.email}</div>
          <div className="text-xs text-gray-500 capitalize">{user.role}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**File:** `apps/frontend-admin/src/components/layout/page-shell.tsx`

```typescript
import { TopNav } from './top-nav';

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

---

### Phase 2: Dashboard Page (Days 4-6)

#### Task 2.1: Create Dashboard Page Shell

**File:** `apps/frontend-admin/src/app/dashboard/page.tsx`

```typescript
'use client';

import { PageShell } from '@/components/layout/page-shell';
import { PresenceStatsWidget } from '@/components/dashboard/presence-stats-widget';
import { SecurityAlertsWidget } from '@/components/dashboard/security-alerts-widget';
import { CheckinsFeedWidget } from '@/components/dashboard/checkins-feed-widget';
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';

export default function DashboardPage() {
  return (
    <PageShell>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-6">
        <PresenceStatsWidget />
        <SecurityAlertsWidget />
        <CheckinsFeedWidget />
        <QuickActionsWidget />
      </div>
    </PageShell>
  );
}
```

#### Task 2.2: Build Presence Stats Widget

**File:** `apps/frontend-admin/src/hooks/use-presence.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'use'
import { apiClient } from '@/lib/api-client'
import { websocketManager } from '@/lib/websocket'

export function usePresence() {
  const query = useQuery({
    queryKey: ['presence'],
    queryFn: async () => {
      const response = await apiClient.checkins.getPresence()
      if (response.status !== 200) throw new Error('Failed to fetch presence')
      return response.body
    },
  })

  useEffect(() => {
    websocketManager.subscribe('presence')

    const handleUpdate = (data: any) => {
      query.refetch() // Refetch on WebSocket update
    }

    websocketManager.on('presence:update', handleUpdate)

    return () => {
      websocketManager.off('presence:update', handleUpdate)
      websocketManager.unsubscribe('presence')
    }
  }, [])

  return query
}
```

**File:** `apps/frontend-admin/src/components/dashboard/presence-stats-widget.tsx`

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { usePresence } from '@/hooks/use-presence';
import { Users } from 'lucide-react';

export function PresenceStatsWidget() {
  const { data, isLoading } = usePresence();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Currently Present</h2>
      </div>

      <div className="text-4xl font-bold text-blue-600">
        {data?.totalPresent ?? 0}
      </div>

      <p className="text-sm text-gray-500 mt-2">
        members on site
      </p>
    </Card>
  );
}
```

#### Task 2.3: Build Security Alerts Widget

**File:** `apps/frontend-admin/src/components/dashboard/security-alerts-widget.tsx`

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { useSecurityAlerts } from '@/hooks/use-security-alerts';

export function SecurityAlertsWidget() {
  const { data: alerts, isLoading } = useSecurityAlerts();

  if (isLoading) {
    return <Card className="p-6">Loading alerts...</Card>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <h2 className="text-lg font-semibold">Security Alerts</h2>
      </div>

      {alerts && alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert: any) => (
            <div key={alert.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
              <div>
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'warning'}>
                  {alert.alertType}
                </Badge>
                <p className="text-sm mt-1">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No active alerts</p>
      )}
    </Card>
  );
}
```

#### Task 2.4: Build Check-ins Feed Widget

**File:** `apps/frontend-admin/src/components/dashboard/checkins-feed-widget.tsx`

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { useRecentCheckins } from '@/hooks/use-checkins';

export function CheckinsFeedWidget() {
  const { data: checkins, isLoading } = useRecentCheckins();

  if (isLoading) {
    return <Card className="p-6">Loading check-ins...</Card>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-green-600" />
        <h2 className="text-lg font-semibold">Recent Check-ins</h2>
      </div>

      {checkins && checkins.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {checkins.slice(0, 10).map((checkin: any) => (
            <div key={checkin.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
              <div>
                <span className="font-medium">{checkin.memberName}</span>
                <span className={checkin.direction === 'in' ? 'text-green-600' : 'text-orange-600'}>
                  {' '}• {checkin.direction === 'in' ? 'checked in' : 'checked out'}
                </span>
              </div>
              <span className="text-gray-500">{new Date(checkin.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No recent activity</p>
      )}
    </Card>
  );
}
```

#### Task 2.5: Build Quick Actions Widget

**File:** `apps/frontend-admin/src/components/dashboard/quick-actions-widget.tsx`

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Users, FileText, Lock } from 'lucide-react';
import { useDdsStatus } from '@/hooks/use-dds';

export function QuickActionsWidget() {
  const { data: ddsStatus } = useDdsStatus();

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Manual Check-in
        </Button>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Visitor Sign-in
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Reports
        </Button>
        <Button variant="outline" size="sm">
          <Lock className="h-4 w-4 mr-2" />
          Execute Lockup
        </Button>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Daily Duty Staff</h3>
        {ddsStatus ? (
          <div className="text-sm">
            <p><span className="font-medium">{ddsStatus.memberName}</span></p>
            <p className="text-gray-500 capitalize">{ddsStatus.status}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No DDS assigned for today</p>
        )}
      </div>
    </Card>
  );
}
```

---

### Phase 3: Members Page (Days 7-10)

#### Task 3.1: Build Members Table

**File:** `apps/frontend-admin/src/app/members/page.tsx`

```typescript
'use client';

import { PageShell } from '@/components/layout/page-shell';
import { MembersTable } from '@/components/members/members-table';
import { MembersFilters } from '@/components/members/members-filters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';

export default function MembersPage() {
  const openCreateModal = useUIStore((state) => state.openCreateMemberModal);

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Members</h1>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          New Member
        </Button>
      </div>

      <MembersFilters />
      <MembersTable />
    </PageShell>
  );
}
```

**File:** `apps/frontend-admin/src/components/members/members-table.tsx`

```typescript
'use client';

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useMembers } from '@/hooks/use-members';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function MembersTable() {
  const { data, isLoading } = useMembers();

  const columns = useMemo(
    () => [
      { accessorKey: 'serviceNumber', header: 'Service #' },
      { accessorKey: 'rank', header: 'Rank' },
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }: any) => `${row.original.firstName} ${row.original.lastName}`,
      },
      { accessorKey: 'division.name', header: 'Division' },
      { accessorKey: 'status', header: 'Status' },
      {
        id: 'actions',
        header: 'Actions',
        cell: () => (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Edit</Button>
            <Button variant="destructive" size="sm">Delete</Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: data?.members ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return <div>Loading members...</div>;
  }

  return (
    <div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-500">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <Button
          variant="outline"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

_(Continue with filters, forms, Check-ins page following similar patterns)_

---

### Phase 4: Check-ins Page (Days 11-12)

Similar implementation to Members page with:

- Check-ins table (TanStack Table with pagination)
- Filters (date range, direction, member, division)
- Manual check-in modal (admin-only)

---

## Critical Files to Create/Modify

### New Files (Frontend)

1. `apps/frontend-admin/package.json`
2. `apps/frontend-admin/tsconfig.json`
3. `apps/frontend-admin/next.config.ts`
4. `apps/frontend-admin/.env.local`
5. `apps/frontend-admin/tailwind.config.ts`
6. `apps/frontend-admin/components.json`
7. All component files listed in project structure above

### Files to Modify

1. `pnpm-workspace.yaml` - Already includes `apps/*` pattern
2. `docker-compose.yml` - Add frontend-admin service (post-MVP)
3. Root `package.json` - Add frontend-specific scripts

---

## Verification Steps

### Phase 1 Verification: Authentication & Layout

1. Start backend: `pnpm dev` from `apps/backend`
2. Start frontend: `pnpm dev` from `apps/frontend-admin`
3. Navigate to `http://localhost:3001`
4. **Test Badge + PIN login:**
   - Enter badge serial (any string for MVP)
   - Should advance to PIN screen
   - Enter PIN (minimum 4 digits)
   - Should redirect to `/dashboard`
5. **Test navigation:**
   - Click "Dashboard", "Members", "Check-ins" links
   - Verify active state highlighting
6. **Test user menu:**
   - Click user dropdown
   - Verify name, email, role displayed
   - Click "Sign Out", verify redirect to `/login`

### Phase 2 Verification: Dashboard Widgets

1. **Test Presence Stats:**
   - Verify number displays correctly from API
   - Create test check-in via backend (Postman or curl)
   - Verify presence count updates in real-time (WebSocket)
2. **Test Security Alerts:**
   - Create test alert via backend
   - Verify alert appears in widget
   - Verify real-time alert updates
3. **Test Check-ins Feed:**
   - Perform badge swipe via backend
   - Verify check-in appears in feed immediately
   - Verify last 10 events shown
4. **Test DDS Status:**
   - Assign DDS via backend API
   - Verify DDS name and status display

### Phase 3 Verification: Members Page

1. **Test Members Table:**
   - Verify members list loads from API
   - Test pagination (previous/next buttons)
   - Change page size, verify update
2. **Test Filters:**
   - Filter by division, verify filtered results
   - Filter by status (active/inactive)
   - Search by name, verify debouncing
   - Clear filters, verify reset
3. **Test Create Member:**
   - Click "New Member" button
   - Fill form with valid data
   - Submit, verify member appears in table
   - Test validation (required fields, formats)
4. **Test Edit/Delete:**
   - Click "Edit" on member row
   - Modify data, save
   - Click "Delete", confirm dialog
   - Verify member removed

### Phase 4 Verification: Check-ins Page

1. **Test Check-ins Table:**
   - Verify check-ins load from API
   - Test pagination
2. **Test Filters:**
   - Filter by date range
   - Filter by direction (in/out)
   - Filter by member
3. **Test Manual Check-in (Admin Only):**
   - Click "Manual Check-in" button
   - Select member, direction
   - Submit, verify check-in appears in table and dashboard feed

---

## Post-MVP Enhancements (Future Phases)

### Phase 5: Remaining Pages

- Events management
- Visitors tracking
- Badges assignment
- DDS management
- Lockup execution
- Reports generation
- Settings configuration

### Phase 6: Comprehensive Testing

- Increase test coverage to 80%+
- Integration tests with MSW
- E2E tests with Playwright (critical flows)
- Visual regression tests

### Phase 7: Performance & Polish

- Code splitting optimization
- Bundle size analysis
- Accessibility audit (WCAG 2.1 AA)
- Dark mode support
- Error tracking (Sentry integration)

### Phase 8: Docker & Deployment

- Multi-stage Dockerfile for frontend
- Add frontend service to docker-compose.yml
- Production environment configuration
- CI/CD pipeline integration

---

## Reference Material

### Original Frontend Code (Git History)

Extract for reference before starting implementation:

```bash
# Checkout specific commits to explore old code
git show e459743:apps/frontend-admin/  # Kiosk UX enhancements
git show 2f9f6b7:apps/frontend-admin/  # Frontend refactoring
git show 690bc7a:apps/frontend-admin/  # Dashboard enhancements
git show 4e5a42f:apps/frontend-admin/  # Members page redesign

# Or create a reference branch
git checkout -b frontend-reference develop
# Explore apps/frontend-admin/ directory
```

### Backend API Documentation

- OpenAPI spec: `http://localhost:3000/docs` (when backend running)
- Contract definitions: `packages/contracts/src/`
- WebSocket events: `apps/backend/src/websocket/`

### Key Technologies Documentation

- Next.js 15: https://nextjs.org/docs
- Shadcn/ui: https://ui.shadcn.com
- TanStack Query: https://tanstack.com/query/latest
- TanStack Table: https://tanstack.com/table/latest
- ts-rest: https://ts-rest.com
- Zustand: https://docs.pmnd.rs/zustand
- React Hook Form: https://react-hook-form.com
- Valibot: https://valibot.dev

---

## Notes & Constraints

### MUST Requirements (from CLAUDE.md)

- ✅ Use pnpm (NOT Bun)
- ✅ TypeScript strict mode
- ✅ NO `any` types (use proper types from contracts)
- ✅ Conventional commit format
- ✅ PR from `rebuild` → `develop` with 1 approval

### Desktop-Only Justification

- Primary use case: office terminals (1920x1080 or higher)
- Minimum supported width: 1280px
- Mobile optimization deferred to post-MVP
- Faster development for MVP

### Minimal Testing Justification

- Focus on feature delivery for MVP
- Defer comprehensive testing to Phase 6
- Basic smoke tests only (login, dashboard load, table rendering)
- Production-grade testing before Phase 5 deployment

### Badge + PIN Technical Notes

- WebSocket or polling for badge scan detection
- Fallback manual serial entry
- PIN validation via better-auth backend
- Session stored in httpOnly cookie
- Auto-redirect to `/login` on 401 responses

### Role-Based UI Hiding

Roles (from backend):

1. **Developer** - Full access (all features visible)
2. **Admin** - Full operational access (hide dev tools)
3. **Executive** - Strategic access (hide operational features like manual check-in, lockup)
4. **Duty Watch** - Operational access (hide admin/executive features)
5. **Quartermaster** - Limited access (view-only for most features)

Navigation items to hide by role:

- Manual check-in button: Duty Watch+ only
- Execute lockup button: Admin+ only
- Settings page: Admin+ only (future)
- DDS assignment: Admin+ only (future)

---

## Success Criteria

**Phase 1 Complete When:**

- User can log in with Badge + PIN
- Top navigation works, user menu functional
- Logout redirects to login page
- WebSocket connection established and stable

**Phase 2 Complete When:**

- Dashboard displays all 4 widgets
- Presence count updates in real-time via WebSocket
- Security alerts appear and update in real-time
- Check-ins feed shows last 10 events, updates live
- DDS status displays correctly

**Phase 3 Complete When:**

- Members table loads and paginates
- Filters work (division, status, search)
- Create member form submits successfully
- Edit/delete actions work
- Role-based hiding functional

**Phase 4 Complete When:**

- Check-ins table loads and paginates
- Filters work (date, direction, member)
- Manual check-in creation works (admin-only)

**MVP Complete When:**

- All Phase 1-4 criteria met
- No TypeScript errors
- No console errors in browser
- All 3 pages accessible via navigation
- Real-time updates working for presence, alerts, check-ins, DDS
- Original frontend code referenced for UX patterns
- Deployed to development environment (localhost:3001)

---

## Open Questions for Implementation

1. **Badge Serial Format:** What format does the RFID reader output? (e.g., hex string, decimal, UUID)
2. **PIN Length:** Is 4-6 digits acceptable, or fixed length?
3. **WebSocket Auth:** Does WebSocket connection require separate authentication, or inherit from HTTP session?
4. **Presence Calculation:** Backend `/api/checkins/presence` returns what shape? (totalPresent, totalMembers, byDivision array?)
5. **Pagination Defaults:** What page size for tables? (25, 50, 100 options suggested)
6. **Date Formats:** What date/time format for display? (ISO, localized, relative "2 minutes ago"?)
7. **Error Toast Library:** Use Shadcn/ui toast component or separate library (react-hot-toast, sonner)?

**Action:** Resolve these questions during implementation by inspecting backend responses and testing.

---

**End of Implementation Plan**
