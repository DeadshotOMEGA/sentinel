# Sentinel Frontend Architecture Analysis

## Project Overview

Sentinel is a React-based RFID attendance tracking system for HMCS Chippawa (Royal Canadian Navy). Three distinct frontend applications with different UX patterns but shared design tokens and type definitions.

**Key Apps:**
- **Admin Dashboard** (`frontend/`) - Management interface for staff
- **Kiosk UI** (`kiosk/`) - Touch-optimized check-in interface
- **TV Display** (`tv-display/`) - Passive wall display interface

---

## 1. Design System Analysis

### Design Token Definition

**File:** `/home/sauk/projects/sentinel/shared/ui/tokens.ts` (1-212 lines)

Centralized token source with:
- **Color Palette**: Primary (Azure #007fff), Secondary/Accent (Orange #ff8000), Success (#00b847), Warning (#ffc107), Danger (#dc2626), Neutral Slate
- **Typography**: Inter (sans), JetBrains Mono (mono)
- **Layout**: Border radius (small 0.375rem, medium 0.5rem, large 0.75rem), box shadows, disabled opacity
- **Status Colors**: `statusColors` object mapping (present→success, absent→danger, visitor→secondary, pending→warning)
- **HeroUI Theme Config**: `sentinelTheme` object exported for plugin usage

**Status**: Well-structured, type-safe with `getStatusColor()` validator

### CSS Custom Properties & Theme

**File:** `/home/sauk/projects/sentinel/shared/ui/theme.css` (1-81 lines)

Root CSS variables (`:root`) for global access outside React:
- `--sentinel-primary`, `--sentinel-accent`, `--sentinel-success`, `--sentinel-warning`, `--sentinel-danger`
- `--sentinel-neutral-*` (50, 100, 200, 700, 900)
- `--sentinel-font-sans`, `--sentinel-font-mono`
- `--sentinel-radius-sm/md/lg`, `--sentinel-shadow-sm/md/lg`
- Touch targets: `--sentinel-touch-min: 48px`, `--sentinel-touch-lg: 56px`

**Mode Classes:**
- `.kiosk-mode`: Larger touch targets (56px), larger fonts
- `.tv-mode`: Wall display optimizations, cursor: default, no hover
- Reduced motion support for Raspberry Pi performance

**Status**: Light-only (no dark theme), WCAG AA compliance enforced

### HeroUI Plugin Configuration

**File:** `/home/sauk/projects/sentinel/shared/ui/hero.ts` (1-10 lines)

Simple wrapper:
```typescript
import { heroui } from "@heroui/react";
import { sentinelTheme } from "./tokens";
export default heroui(sentinelTheme);
```

**Imports in each app:**
- Frontend: `@import "@plugin '../shared/ui/hero.ts';"` in `src/styles/global.css`
- Kiosk: Imported indirectly through `@theme` in global.css
- TV Display: Same pattern as frontend

**Status**: Clean separation, but no custom HeroUI extensions documented

### Tailwind Configuration

Each app uses **Tailwind CSS v4 via `@tailwindcss/vite`** with:

**Frontend** (`frontend/src/styles/global.css` lines 1-55):
- Imports theme.css from shared
- Defines touch spacing tokens (48px standard)
- TV-specific font sizes (3rem, 4rem, 5rem, 6rem)
- Contrast enforcement for inputs
- Light mode only

**Kiosk** (`kiosk/src/styles/global.css` lines 1-106):
- **56px touch targets** (larger than baseline 48px)
- Custom Tailwind theme with primary/danger/gray colors
- Custom component classes:
  - `.kiosk-button-primary`: 56px min height, primary color, active scale-95
  - `.kiosk-button-secondary`: Outlined style with border-2
  - `.kiosk-button-danger`: Red buttons for cancellation
  - `.kiosk-input`: 56px min height, focus ring styling
- Text selection disabled globally (except inputs)
- Tap highlight disabled

**TV Display** (`tv-display/src/index.css` lines 1-149):
- Large spacing tokens (32rem, 36rem, 40rem)
- TV-specific font sizes (1.25rem to 6rem)
- `.tv-mode` class removes cursor and hover effects
- KPI stat classes: `.kpi-stat-value` (5rem), `.kpi-stat-label` (1.5rem)
- Activity feed styling with `.tv-activity-*` classes
- Status colors: `.status-present`, `.status-absent`, `.status-late`
- Fade-in animation with reduced-motion support

**Status**: No centralized Tailwind config file found—each app has inline `@theme` blocks. CSS is scattered rather than consolidated.

---

## 2. Component Patterns

### Statistics/KPI Cards

**Files:**
- Frontend: `src/pages/Dashboard.tsx` lines 26-35 (StatCard component)
- Frontend: `src/pages/Events.tsx` lines 34-43 (StatCard identical)
- TV Display: `src/components/PresenceCards.tsx` (not fully shown, referenced in PresenceView)
- TV Display: `src/components/DivisionStats.tsx` lines 11-54 (full component)

**Dashboard StatCard** (Frontend):
```tsx
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="flex-1">
      <CardBody className="text-center">
        <p className={`text-4xl font-bold ${color}`}>{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </CardBody>
    </Card>
  );
}
```
- Uses HeroUI Card/CardBody
- Accepts className string for color (not semantic)
- **Issue**: Color passed as string like `text-success` or `text-gray-600`
- Used in Dashboard (stats), Events (stats)

**DivisionStats** (TV Display):
```tsx
interface Division {
  name: string;
  present: number;
  total: number;
}

// Grid of division cards with progress bars
// Hard-coded styles: bg-white, border, emerald-600 for progress
```
- Each division shows present/total with % calculation
- Progress bar with fixed emerald-600 color
- Grid layout responsive: 3 cols → 4 cols XL
- **Issue**: Hard-coded emerald color, not using design tokens

**PresenceCards** (TV Display, referenced in PresenceView):
- Compact KPI-style cards (mentioned in import, not fully read)

**Status**: Cards exist but inconsistent styling approach. StatCard is reused but color prop is fragile. TV Display hard-codes colors.

### Table Components

**File:** `/home/sauk/projects/sentinel/frontend/src/components/ui/SentinelTable.tsx` (1-173 lines)

Custom table component wrapping `react-aria-components` with Tailwind styling (since HeroUI v3 lacks Table):

```tsx
const baseStyles = {
  table: 'w-full border-collapse text-sm',
  header: 'border-b border-gray-200',
  column: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 bg-gray-50',
  body: 'divide-y divide-gray-100',
  row: 'hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
  cell: 'px-4 py-3 text-gray-700',
};
```

**Structure:** Compound component pattern with:
- `SentinelTable` (root)
- `SentinelTableHeader`, `SentinelTableColumn`, `SentinelTableBody`
- `SentinelTableRow`, `SentinelTableCell`

**Features:**
- Exported as both `Table/TableHeader/...` and `SentinelTable/SentinelTableHeader/...`
- Type-safe with generic `<T extends object>` for body/header
- Empty content support
- Focus ring styling with primary color
- Hover state on rows

**Used in:**
- Members page (implied)
- Events page (implied)
- Visitors page (implied)

**Status**: Single, well-structured implementation. Only used in frontend (not kiosk/TV).

### Badge/Chip Components

**Frontend Dashboard** (`src/pages/Dashboard.tsx` lines 169-179):
```tsx
<span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
  item.type === 'checkin'
    ? 'bg-success-100 text-success-700'
    : item.type === 'checkout'
    ? 'bg-warning-100 text-warning-700'
    : 'bg-primary-100 text-primary-700'
}`}>
```
- Inline styled spans, not reusable component
- **Issue**: Colors hard-coded with HeroUI color names (success-100, warning-700)

**Frontend Events** (referenced):
- Uses `Chip` from HeroUI polyfills

**Status**: Badges duplicated inline. Should be extracted to reusable component.

### Button Components

**HeroUI Button** (frontend, from polyfills):
- `Button` from `@heroui/react`
- Used with variants: `variant="light"` in TopBar

**Custom Kiosk Buttons** (`kiosk/src/styles/global.css`):
- `.kiosk-button-primary`, `.kiosk-button-secondary`, `.kiosk-button-danger`
- Fully styled in CSS with custom active/disabled states
- No React component wrapper (used as className directly)

**TV Display Buttons:**
- Removed hover states (cursor: default)
- Uses react-aria or standard buttons

**Status**: Mixed approach. Frontend uses HeroUI, Kiosk uses CSS classes. Should be unified.

### Modal/Dialog Components

**Frontend Modals** (using HeroUI `Modal`):
- `AddAttendeeModal.tsx` (6509 bytes)
- `BadgeAssignmentModal.tsx` (10055 bytes)
- `EventModal.tsx` (7625 bytes)
- `ImportModal.tsx` (22221 bytes)
- `MemberModal.tsx` (7703 bytes)

All use `Modal`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter` from HeroUI.

**Kiosk Modals:**
- `MemberPickerModal.tsx` (component)
- No documented modal usage visible

**TV Display:**
- No modals (passive display)

**Status**: Consistent HeroUI usage in frontend modals.

### Activity Feed/List Components

**TV Display ActivityFeed** (`src/components/ActivityFeed.tsx` - 2627 bytes):
- Consumes activity data via hook
- Styles using `.tv-activity-*` classes from theme.css

**Frontend Recent Activity** (Dashboard lines 156-186):
- Custom list with inline styles
- Badge coloring duplicated

**Status**: TV Display has dedicated component, frontend is inline.

---

## 3. State Management

### Authentication (Zustand)

**File:** `/home/sauk/projects/sentinel/frontend/src/hooks/useAuth.ts` (1-77 lines)

```typescript
interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'coxswain' | 'readonly';
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'sentinel-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.checkAuth();
      },
    }
  )
);
```

**Features:**
- Persisted via localStorage (middleware: `persist`)
- Token + user object stored
- `checkAuth()` validates on hydration
- 3-role system: admin, coxswain, readonly

**Status**: Type-safe, well-structured. Only in frontend (kiosk/TV-display likely don't need auth).

### WebSocket (Custom Hook)

**File:** `/home/sauk/projects/sentinel/frontend/src/hooks/useSocket.ts` (1-67 lines)

```typescript
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current.emit('subscribe_presence');
    return () => socketRef.current?.disconnect();
  }, [isAuthenticated]);

  const onPresenceUpdate = useCallback((callback: SocketCallback<{ stats: PresenceStats }>) => {
    socketRef.current?.on('presence_update', callback);
    return () => socketRef.current?.off('presence_update', callback);
  }, []);

  const onCheckin = useCallback((callback: SocketCallback<CheckinEvent>) => {
    socketRef.current?.on('checkin', callback);
    return () => socketRef.current?.off('checkin', callback);
  }, []);

  const onVisitorSignin = useCallback((callback: SocketCallback<VisitorSigninEvent>) => {
    socketRef.current?.on('visitor_signin', callback);
    return () => socketRef.current?.off('visitor_signin', callback);
  }, []);

  return { onPresenceUpdate, onCheckin, onVisitorSignin };
}
```

**Events Handled:**
- `presence_update`: Real-time stats (present, absent, visitors, totalMembers)
- `checkin`: Member check-in/out with rank, division, direction
- `visitor_signin`: Visitor arrival with organization, visitType

**Used in:**
- Dashboard (subscribes to all three)

**Status**: Type-safe with callback pattern. Listeners unsubscribed properly.

### Client State (Zustand)

**Kiosk State** (`/home/sauk/projects/sentinel/kiosk/src/state/kiosk-state.ts` lines 1-80+):

```typescript
export type KioskScreen = 'idle' | 'scanning' | 'success' | 'error' | 'visitor' | 'visitor-success' | 'event-selection';

interface KioskState {
  currentScreen: KioskScreen;
  checkinResult: CheckinResult | null;
  error: KioskError | null;
  selectedEventId: string | null;
  visitorName: string | null;
  // Actions: setScreen, setCheckinResult, setError, reset, etc.
}

export const useKioskStore = create<KioskState>((set) => ({ ... }));
```

**Purpose:** Screen state machine for kiosk UI flow

**Status**: Type-safe, clear separation of concerns.

**Sync State** (`kiosk/src/state/sync-state.ts` - not read but referenced):
- Manages offline queue and sync status

### React Query (Server State)

**Usage Pattern** (Frontend Dashboard):
```typescript
const { data: stats, isLoading } = useQuery({
  queryKey: ['presence-stats'],
  queryFn: async () => {
    const response = await api.get<{ stats: PresenceStats }>('/checkins/presence');
    return response.data.stats;
  },
  refetchInterval: 60000,
});

const { data: recentActivity, } = useQuery({
  queryKey: ['recent-activity'],
  queryFn: async () => { ... },
});
```

**Features:**
- Typed responses with generics
- Auto-refetch on intervals
- Pagination-ready (though not shown)

**Status**: Standard React Query patterns.

---

## 4. CSS Architecture

### Global CSS Files

| App | File | Purpose | Size | Notes |
|-----|------|---------|------|-------|
| Frontend | `src/styles/global.css` | Tailwind setup, HeroUI plugin | 55 lines | Imports shared theme |
| Kiosk | `src/styles/global.css` | Tailwind setup, kiosk components | 106 lines | Custom button/input classes |
| TV Display | `src/index.css` | Tailwind setup, TV-mode classes | 149 lines | Large fonts, activity feed styles |

### Shared Theme

**File:** `/home/sauk/projects/sentinel/shared/ui/theme.css` (81 lines)
- CSS custom properties (root)
- `.kiosk-mode` and `.tv-mode` class modifiers
- Reduced motion support

### Theme Application

**Frontend:**
```css
@import "tailwindcss";
@plugin "../../hero.ts";
@source "../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}";
@custom-variant dark (&:is(.dark *));
@import "../../../shared/ui/theme.css";
```
- Tailwind v4 syntax
- HeroUI plugin included
- Shared theme imported
- (Note: dark variant defined but not used—light-only constraint)

**Kiosk:**
```css
@import "tailwindcss";
@import "@heroui/styles";  // Note: different from frontend
@import "../../../shared/ui/theme.css";
```
- Uses `@heroui/styles` (not plugin)
- Inline `@theme` block with colors/fonts

**TV Display:**
```css
@import "tailwindcss";
@import "@heroui/styles";
@import "../../shared/ui/theme.css";
```
- Same as kiosk
- Inline `@theme` with TV-specific tokens

**Status**: **Inconsistency**: Frontend uses HeroUI plugin, Kiosk/TV use `@heroui/styles` only. `@theme` blocks duplicated.

### Custom Component Classes

**Kiosk:**
- `.kiosk-button-primary` (56px, primary color, scale-95 active)
- `.kiosk-button-secondary` (56px, outlined)
- `.kiosk-button-danger` (56px, red)
- `.kiosk-input` (56px, focus ring)

**TV Display:**
- `.tv-card`, `.tv-section`, `.tv-activity-item`, `.tv-activity-time`, `.tv-activity-name`, `.tv-activity-badge`
- `.kpi-stat-value`, `.kpi-stat-label`
- `.status-present`, `.status-absent`, `.status-late`

**Frontend:**
- None (uses HeroUI Button directly)

**Status**: Kiosk/TV have isolated component classes. No sharing between apps.

---

## 5. Shared Code

### Types

**File:** `/home/sauk/projects/sentinel/shared/types/index.ts` (6771 bytes)

Exports all TypeScript interfaces:
- `Member`, `Visitor`, `Event`, `Badge`, `Division`, `Checkin`
- API request/response types
- Enums: `EventStatus`, `DivisionName`, `VisitType`

**Status**: Comprehensive, shared across all apps.

### Other Shared

**Directory:** `/home/sauk/projects/sentinel/shared/` structure:
```
shared/
├── types/
│   └── index.ts (main types file)
├── ui/
│   ├── tokens.ts (design tokens)
│   ├── theme.css (CSS variables + mode classes)
│   └── hero.ts (HeroUI plugin)
├── package.json
└── (no other files observed)
```

**Status**: Only types and design tokens shared. No shared React components.

---

## 6. Architecture Patterns

### Frontend App Structure

**Entry Point:** `src/main.tsx`
```typescript
// Vite app setup (typical React 18)
```

**Router Setup** (`src/App.tsx`):
```tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
    <Route index element={<Dashboard />} />
    <Route path="members" element={<Members />} />
    <Route path="visitors" element={<Visitors />} />
    <Route path="events" element={<Events />} />
    <Route path="events/:id" element={<EventDetail />} />
    <Route path="events/:id/monitor" element={<EventMonitor />} />
    <Route path="reports" element={<Reports />} />
    <Route path="settings" element={<Settings />} />
  </Route>
</Routes>
```

**Layout** (`src/layouts/DashboardLayout.tsx`):
```tsx
<div className="flex h-screen bg-gray-50">
  <AppSidebar />
  <main className="flex flex-1 flex-col overflow-hidden">
    <Outlet />
  </main>
</div>
```

**Sidebar** (`src/components/AppSidebar.tsx` - 2031 bytes):
- Wraps Sidebar component from `pro/` folder
- Navigation items

**Sidebar Component** (`src/components/pro/Sidebar.tsx` - complex, 312 lines):
- Compound component based on HeroUI Listbox
- Supports nested items, icons, compact mode
- Uses Accordion for nested sections

**Top Bar** (`src/components/TopBar.tsx` - 47 lines):
- User avatar dropdown
- Logout button
- Uses HeroUI Dropdown

**Pages:**
- `Dashboard.tsx`: Presence stats + recent activity
- `Members.tsx`: Member table
- `Visitors.tsx`: Visitor table
- `Events.tsx`: Event table + stat cards
- `EventDetail.tsx`: Single event view
- `EventMonitor.tsx`: Live event checkins
- `Reports.tsx`: Reporting page
- `Settings.tsx`: Admin settings
- `Login.tsx`: Authentication

**Status**: Standard React + React Router pattern. Layout and sidebar well-structured.

### Kiosk App Structure

**Entry Point:** `src/main.tsx`

**App Root** (`src/App.tsx` - 1625 bytes):
- State machine renderer
- Screens: idle, scanning, success, error, visitor, visitor-success, event-selection

**Screen Components** (`src/screens/`):
- `IdleScreen.tsx` (75 lines): "Tap your badge" prompt
- `ScanningScreen.tsx` (10 lines): Loading spinner
- `SuccessScreen.tsx`: Check-in confirmation
- `ErrorScreen.tsx`: Error display with "how to fix"
- `VisitorScreen.tsx`: Visitor sign-in form
- `VisitorSuccessScreen.tsx`: Visitor confirmation
- `EventSelectionScreen.tsx`: Event picker (conditional)

**Hooks:**
- `useBadgeScanner.ts`: NFC reader integration
- `useNetworkStatus.ts`: Online/offline detection
- `usePresenceData.ts`: WebSocket subscription (in TV, not kiosk)

**Services:**
- `sync-service.ts`: Offline queue + bulk upload
- `offline-queue.ts`: IndexedDB operations

**Status**: Screen-based architecture suits single-page kiosk well.

### TV Display App Structure

**Entry Point:** `src/main.tsx`

**App Root** (`src/App.tsx`):
- Config-driven rendering
- Conditional views: PresenceView (default), EventView

**Pages:**
- `PresenceView.tsx` (59 lines): Main presence display with sidebar
- `EventView.tsx`: Event-specific display

**Components:**
- `PersonCards.tsx` (167 lines): Grid of person cards with sorting/filtering
- `DivisionStats.tsx` (54 lines): Division progress bars
- `PresenceCards.tsx`: Compact KPI cards
- `ActivityFeed.tsx` (2627 bytes): Scrolling activity log
- `Clock.tsx`: Real-time clock
- `ConnectionStatus.tsx`: Network indicator

**Hooks:**
- `usePresenceData.ts`: WebSocket subscription to presence updates
- `useEventPresenceData.ts`: Event-specific presence
- `useActivityFeed.ts`: Activity log subscription

**Layout Pattern:**
```
┌─────────────────────────┬──────────────────┐
│ Main Content (75%)      │ Activity Feed    │
│ ├─ Stats                │ (18%, optional)  │
│ ├─ Person Cards         │                  │
│ └─ Division Stats       │                  │
└─────────────────────────┴──────────────────┘
```

**Status**: View-based architecture with sidebar layout. TV-mode styling applied globally.

---

## 7. Dependencies & Integration Points

### Frontend Dependencies

**Key Packages** (from `package.json`):
- `@heroui/react` (^2.8.5): UI components
- `@tanstack/react-query` (^5.17.0): Server state
- `react-router-dom` (^6.21.0): Routing
- `zustand` (^4.4.0): Client state (auth)
- `socket.io-client` (^4.7.2): WebSocket
- `axios` (^1.6.0): HTTP requests
- `tailwindcss` (^4.1.17): Styling
- `@tailwindcss/vite` (^4.1.17): Vite plugin
- `framer-motion` (^12.23.24): Animations
- `date-fns` (^3.0.0): Date utilities
- `@iconify/react` (^6.0.2): Icons
- `clsx` (^2.1.0): className merging

**Backend Integration:**
- API endpoint: `/api` (proxied to `http://localhost:3000` in dev)
- WebSocket: `/socket.io` (proxied, ws: true)

**Status**: Clean dependencies. `axios` could use `fetch` but acceptable choice.

### Vite Configuration

**File:** `/home/sauk/projects/sentinel/frontend/vite.config.ts` (27 lines):
```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
});
```

**Status**: Clean aliases and proxy setup.

---

## 8. What Works Well

### Strengths

1. **Design Tokens Centralized** (`shared/ui/tokens.ts`)
   - Single source of truth for colors, typography, layout
   - Type-safe with `getStatusColor()` validator
   - HeroUI-compatible theme object

2. **CSS Variables + CSS Classes**
   - Both approaches available (variables for outside React, classes inside)
   - Mode classes (`.kiosk-mode`, `.tv-mode`) allow contextual styling

3. **Type Safety**
   - TypeScript strict mode likely enabled
   - Shared types across all apps
   - No `any` types (per CLAUDE.md constraint)

4. **State Management Separation**
   - Auth: Zustand + persist
   - Server: React Query
   - UI: Zustand (kiosk screen state)
   - Clear boundaries

5. **WebSocket Integration**
   - Custom hook `useSocket()` with callback pattern
   - Proper cleanup (unsubscribe)
   - Type-safe events

6. **Accessibility (Intended)**
   - WCAG AA contrast ratios defined
   - Focus ring styling on tables
   - Touch targets 48px minimum (56px kiosk)
   - `@media (prefers-reduced-motion: reduce)` support

7. **Component Structure**
   - SentinelTable: Proper compound component pattern
   - Pro Sidebar: Complex but well-structured
   - Modal components: Consistent HeroUI usage

---

## 9. What Needs Refactoring

### Critical Issues

1. **Duplicated CSS Configuration**
   - `@theme` blocks in kiosk, TV, and frontend all define similar tokens
   - Should be single Tailwind config file with per-app overrides
   - **Impact**: Hard to maintain, inconsistent color values
   - **Solution**: Create `tailwind.config.ts` in each app importing shared tokens

2. **Inconsistent HeroUI Usage**
   - Frontend: Uses `@plugin '../shared/ui/hero.ts'` (HeroUI plugin)
   - Kiosk/TV: Use `@import '@heroui/styles'` only
   - **Impact**: Color tokens applied differently
   - **Solution**: Standardize on plugin approach across all apps

3. **Hard-Coded Colors in Components**
   - DivisionStats: `bg-emerald-600` hard-coded (line 41)
   - Dashboard badges: `bg-success-100`, `text-success-700` (lines 172-175)
   - TV PersonCards: `border-l-amber-500`, `border-l-emerald-500` (lines 117, 149)
   - **Impact**: Brand color changes require code search
   - **Solution**: Extract to semantic tokens/component classes

4. **Inline Color Strings in Props**
   - StatCard: `color: "text-gray-600"` passed as string (Dashboard line 144)
   - Color composition happens at call site
   - **Impact**: Type-unsafe, fragile
   - **Solution**: Create color variant enums or accept semantic props

5. **Missing Reusable Components**
   - Badges: Duplicated inline in Dashboard (lines 169-179)
   - Activity items: Duplicated patterns across Dashboard and TV
   - Badge/Chip: Used directly from HeroUI without wrapper
   - **Solution**: Extract StatBadge, ActivityListItem components

6. **No Tailwind Config Files**
   - All apps use inline `@theme` blocks in CSS files
   - Zero `.config.ts` files found (except Vite configs)
   - **Impact**: IDE autocomplete may not work perfectly
   - **Solution**: Create `tailwind.config.js` per app following Tailwind v4 pattern

7. **Fragmented Button Implementation**
   - Frontend: HeroUI Button
   - Kiosk: CSS classes (.kiosk-button-*)
   - TV: Standard buttons with TV-mode class
   - **Impact**: Inconsistent interactive behavior
   - **Solution**: Create React components for kiosk/TV buttons, unify sizing

8. **CSS Class Names Scattered**
   - `.tv-activity-item`, `.tv-activity-time`, etc. only used in TV Display
   - `.kiosk-button-primary` only in Kiosk
   - No pattern for shared styling
   - **Solution**: Organize CSS by feature/component, not by app

### Medium Priority

9. **Component Organization**
   - `src/components/pro/` folder (Pro versions of components)
   - Only `Sidebar.tsx` found in there—unclear why "pro" prefix
   - **Solution**: Clarify naming (just `components/Sidebar.tsx`?)

10. **API Layer**
    - Uses axios with hardcoded `/api` prefix
    - No OpenAPI/type generation from backend
    - **Solution**: Consider tRPC or type-safe API generation

11. **Modal Styling**
    - All modals use HeroUI Modal directly
    - No consistent padding, spacing, scrolling rules
    - **Solution**: Create ModalLayout wrapper component

12. **Error Handling**
    - WebSocket errors not observed/logged
    - Query errors fall back silently
    - **Solution**: Add error boundary + toast notifications

---

## 10. Missing Features

### Design System Gaps

1. **Typography System**
   - Design tokens define fonts (Inter, JetBrains Mono)
   - No heading scale (h1-h6) variants defined
   - **Should add**: Font size scale (12px, 14px, 16px, 18px, 20px, 24px, 28px, 32px, 36px)

2. **Spacing System**
   - CSS variables use touch targets only
   - No standard spacing scale (4px, 8px, 12px, 16px, 24px, 32px...)
   - **Should add**: Extend `@theme` with spacing scale

3. **Component Variants**
   - Buttons: Only primary/secondary/danger (no tertiary, ghost, outline)
   - Cards: Basic only (no hoverable, interactive, clickable variants)
   - Badges: No size variants (sm, md, lg)
   - **Should add**: Variants for all interactive components

4. **Dark Mode**
   - Explicitly disabled per CLAUDE.md constraint
   - But dark theme defined in tokens.ts and CSS has dark variant
   - **Action**: Remove dark theme code to reduce confusion

5. **Responsive Breakpoints**
   - Some usage of `sm:`, `lg:`, `xl:`, `2xl:` Tailwind breakpoints
   - Not documented in design system
   - **Should clarify**: Which breakpoints are required per app

6. **Animation & Transition System**
   - Framer Motion installed but minimal usage seen
   - TV Display has custom `fade-in` animation
   - **Should add**: Animation token system (duration, easing)

---

## 11. File Reference Summary

### Critical Files

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `shared/ui/tokens.ts` | 212 | Design tokens (colors, layout, fonts) | Well-structured |
| `shared/ui/theme.css` | 81 | CSS variables + mode classes | Complete |
| `shared/ui/hero.ts` | 10 | HeroUI plugin wrapper | Simple, functional |
| `shared/types/index.ts` | 6771 | All TypeScript interfaces | Comprehensive |
| `frontend/src/App.tsx` | ~45 | Router setup | Clean |
| `frontend/src/layouts/DashboardLayout.tsx` | 13 | Page layout | Simple |
| `frontend/src/components/ui/SentinelTable.tsx` | 173 | Custom table component | Well-designed |
| `frontend/src/components/pro/Sidebar.tsx` | 312 | Navigation sidebar | Complex but functional |
| `frontend/src/components/TopBar.tsx` | 47 | Header with user menu | Clean |
| `frontend/src/hooks/useAuth.ts` | 77 | Auth state (Zustand + persist) | Type-safe |
| `frontend/src/hooks/useSocket.ts` | 67 | WebSocket subscription | Well-structured |
| `frontend/src/pages/Dashboard.tsx` | 193 | Main dashboard view | Has duplicated styling |
| `kiosk/src/state/kiosk-state.ts` | 80+ | Screen state machine | Clear |
| `kiosk/src/styles/global.css` | 106 | Kiosk Tailwind + components | Has custom button classes |
| `tv-display/src/index.css` | 149 | TV Tailwind + components | Has TV-specific classes |
| `tv-display/src/components/PersonCards.tsx` | 167 | Person card grid | Uses hard-coded colors |
| `tv-display/src/components/DivisionStats.tsx` | 54 | Division progress display | Uses hard-coded emerald |
| `tv-display/src/pages/PresenceView.tsx` | 59 | Main TV view | Clean layout |

### Key Hooks & Services

| File | Purpose | Used In |
|------|---------|---------|
| `frontend/src/hooks/useAuth.ts` | Authentication state | Frontend app |
| `frontend/src/hooks/useSocket.ts` | WebSocket subscription | Dashboard, other pages |
| `kiosk/src/state/kiosk-state.ts` | Screen state machine | Kiosk app |
| `kiosk/src/hooks/useNetworkStatus.ts` | Online/offline detection | Kiosk app |
| `kiosk/src/services/sync-service.ts` | Offline queue sync | Kiosk app |
| `tv-display/src/hooks/usePresenceData.ts` | Presence WebSocket | PresenceView |
| `tv-display/src/hooks/useActivityFeed.ts` | Activity log WebSocket | ActivityFeed |

---

## 12. Dependency Graph

```
shared/
├── types/index.ts → Used by all 3 apps
└── ui/
    ├── tokens.ts → Imported by frontend, kiosk, TV
    ├── theme.css → Imported by all 3 apps
    └── hero.ts → Used by frontend (plugin), referenced by kiosk/TV

frontend/
├── App.tsx → Router
├── layouts/DashboardLayout.tsx → Main layout
├── components/
│   ├── AppSidebar.tsx → Uses pro/Sidebar.tsx
│   ├── TopBar.tsx → Uses HeroUI components
│   ├── ui/SentinelTable.tsx → Uses react-aria + HeroUI cn()
│   ├── ui/heroui-polyfills.tsx → Re-exports @heroui/react
│   └── *Modal.tsx → Uses HeroUI Modal
├── pages/
│   ├── Dashboard.tsx → Uses useSocket, useQuery, StatCard
│   └── Events.tsx → Uses useQuery, StatCard, SentinelTable
├── hooks/
│   ├── useAuth.ts → Zustand store
│   └── useSocket.ts → Socket.io client
├── styles/global.css → Tailwind + theme
└── vite.config.ts → Plugin setup

kiosk/
├── App.tsx → Screen state machine
├── screens/ → Component per screen
├── state/kiosk-state.ts → Zustand store
├── styles/global.css → Tailwind + custom components
└── services/ → Offline sync, API

tv-display/
├── App.tsx → Conditional view rendering
├── pages/ → PresenceView, EventView
├── components/ → PersonCards, DivisionStats, etc.
├── hooks/ → usePresenceData, useActivityFeed
└── index.css → Tailwind + TV-specific styles
```

---

## 13. Technology Stack Review

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Runtime** | Bun | Latest | Fast package manager (WSL2) |
| **React** | ^18.2.0 | Latest stable | Hooks + functional components |
| **Routing** | React Router | ^6.21.0 | Client-side routing |
| **State (Client)** | Zustand | ^4.4.0 | Auth + UI state |
| **State (Server)** | React Query | ^5.17.0 | API queries + caching |
| **Styling** | Tailwind CSS | ^4.1.17 | Utility-first + v4 syntax |
| **UI Library** | HeroUI | ^2.8.5 | Headless + Tailwind |
| **Icons** | Iconify | ^6.0.2 | Icon library |
| **WebSocket** | Socket.io | ^4.7.2 | Real-time updates |
| **HTTP** | Axios | ^1.6.0 | REST client |
| **Date Handling** | date-fns | ^3.0.0 | Date utilities |
| **Animations** | Framer Motion | ^12.23.24 | Motion library |
| **Build** | Vite | ^5.0.0 | Fast bundler |
| **Type Checking** | TypeScript | ^5.3.0 | Type safety |

**Status**: Modern, well-chosen stack. No outdated dependencies.

---

## 14. Accessibility Checklist

### What's Implemented

- [x] WCAG AA contrast ratios (4.5:1 minimum)
- [x] Touch targets 48px minimum (56px kiosk)
- [x] Focus ring styling on table rows
- [x] `@media (prefers-reduced-motion: reduce)` support
- [x] Semantic HTML (react-aria components for tables)
- [x] Form input accessibility (placeholder, focus states)

### What's Missing

- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation testing (only click/touch observed)
- [ ] Screen reader testing
- [ ] Color contrast verification (trust: not tested)
- [ ] Mobile/tablet responsive testing
- [ ] Error messages accessibility (ARIA live regions?)

---

## 15. Performance Considerations

### Optimizations Present

1. **Lazy Loading:** React Router lazy route splitting (implicit)
2. **Memoization:** `useMemo()` in PersonCards (line 67) for sort/filter
3. **Callback Memoization:** `useCallback()` in WebSocket hook, Sidebar
4. **Query Caching:** React Query cacheTime/staleTime (default 5min)
5. **Tailwind:** Utility-first CSS minimizes unused code

### Potential Issues

1. **SentinelTable:** Recreates className strings on every render (no memoization)
2. **PersonCards:** Sorting happens on every render (fixed by useMemo at 67)
3. **WebSocket:** Multiple subscribers per hook (Dashboard has 3 subscriptions)
4. **Modal Styling:** All modals re-create HeroUI markup (no shared layout wrapper)
5. **TV Display:** Large grids (5-6 columns) may re-render slowly on Raspberry Pi

### Raspberry Pi Optimizations

- Reduced motion: Implemented via media query
- Animation duration: `.01ms` in reduced-motion mode
- Cursor: Disabled in TV mode (cursor: default)
- No hover states in TV mode

---

## 16. Summary of Issues & Priority

### Tier 1: Block UI Epic Implementation
1. Consolidate CSS config files (create shared tailwind.config per app)
2. Remove hard-coded colors from components (use semantic tokens)
3. Extract reusable badge/status components
4. Standardize HeroUI setup (plugin vs. styles)

### Tier 2: Improve Maintainability
5. Create button/input component wrappers (unify kiosk + frontend + TV)
6. Document responsive breakpoints (sm, md, lg, xl, 2xl usage)
7. Create component library documentation
8. Add Storybook or component showcase

### Tier 3: Future Work
9. Add dark mode (when constraint lifted)
10. Implement animation token system
11. Add typography scale documentation
12. Consider OpenAPI/type generation from backend

---

## 17. Recommendations for UI Epic

### Phase 1: Foundation (Required Before Component Work)

1. **Consolidate Design Tokens**
   - Keep `shared/ui/tokens.ts` as single source
   - Add typography scale (font sizes, weights, line heights)
   - Add spacing scale (margin, padding utilities)
   - Add shadow scale (elevation system)

2. **Fix Tailwind Configuration**
   - Create `tailwind.config.ts` in each app (Tailwind v4)
   - Import shared tokens as `base` theme
   - Remove duplicate `@theme` blocks
   - Standardize HeroUI setup

3. **Extract Semantic Components**
   - `StatCard.tsx`: Reusable stat display with color variants
   - `StatBadge.tsx`: Activity type badges
   - `ActivityItem.tsx`: Reusable activity list item
   - `KpiCard.tsx`: TV-specific KPI display

4. **Document Component Patterns**
   - Component prop interface patterns
   - Color prop handling (semantic, not hard-coded)
   - Responsive patterns per app

### Phase 2: Component Improvements

5. **Button System**
   - Create `Button.tsx` wrapping HeroUI for frontend
   - Export kiosk button classes with React wrapper
   - Create TV button variant (no hover)
   - Support variants: primary, secondary, danger, tertiary, ghost

6. **Table Component**
   - Extend SentinelTable with sorting, filtering
   - Add empty state handling
   - Add loading state
   - Add selection state (checkboxes)

7. **Modal System**
   - Create ModalLayout wrapper (padding, spacing consistency)
   - Support header, body, footer variants
   - Add scrolling body option
   - Add size variants (sm, md, lg)

### Phase 3: Enhancement & Optimization

8. **Responsive Improvements**
   - Test all components on mobile, tablet, desktop
   - Define breakpoint usage per app
   - Add responsive utilities per app

9. **Performance Audit**
   - Measure Lighthouse scores
   - Test on actual Raspberry Pi hardware
   - Optimize animation performance
   - Implement code splitting per route

10. **Accessibility Audit**
    - Run axe DevTools on all pages
    - Test keyboard navigation
    - Test with screen reader
    - Verify color contrast

---

## Conclusion

The Sentinel frontend has a **solid foundation** with centralized design tokens, proper TypeScript types, and clear separation between apps. However, **CSS configuration is scattered**, component styling is **inconsistently applied**, and **reusable components are minimal**.

**The UI Epic should prioritize:**
1. Consolidating Tailwind configuration
2. Extracting reusable styled components
3. Creating a consistent design token application layer
4. Building a proper component library before adding new features

This will make the codebase more maintainable and prevent duplicate work across the three frontend apps.
