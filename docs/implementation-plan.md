# Sentinel RFID Attendance System - Phased Implementation Plan

**Last Updated**: November 25, 2024
**Project**: RFID Attendance Tracking for HMCS Chippawa
**Tech Stack**: React + TypeScript + HeroUI Pro + Tailwind + PostgreSQL + Redis + WebSocket + Node.js + Bun
**Hardware**: Raspberry Pi 5 (backend server + 2 kiosk devices with PN532 NFC HAT)

---

## Executive Summary

This document outlines an 8-phase implementation plan for Sentinel, prioritized by dependencies and deliverable milestones. Each phase builds on the previous, allowing for incremental testing and deployment.

### Phase Overview

| Phase | Focus | Duration | Complexity | Dependencies |
|-------|-------|----------|------------|--------------|
| **Phase 0** | Project Setup & Integrations | ✅ Complete | S | None |
| **Phase 1** | Foundation & Core Data Model | 2-3 weeks | M | Phase 0 |
| **Phase 2** | Backend API & WebSocket Infrastructure | 2-3 weeks | L | Phase 1 |
| **Phase 3** | Admin Dashboard (Core Features) | 3-4 weeks | L | Phase 1, 2 |
| **Phase 4** | Kiosk Interface & NFC Integration | 2-3 weeks | M | Phase 1, 2 |
| **Phase 5** | Offline Queue & Sync System | 2 weeks | M | Phase 2, 4 |
| **Phase 6** | TV Display & Real-Time Updates | 1-2 weeks | S | Phase 2, 3 |
| **Phase 7** | Events & Temporary Groups Feature | 2-3 weeks | M | Phase 1-4 |

**Total Estimated Duration**: 14-20 weeks (3.5-5 months)

---

## Phase 0: Project Setup & Integrations ✅

**Goal**: Establish version control, project management, and development tooling.

**Status**: Complete

**Deliverables**:
- [x] GitHub repository initialized and pushed
- [x] GitHub MCP server configured for Claude Code
- [x] Monday.com MCP server configured for project tracking
- [x] Agent/command files updated to use Task tool + Monday.com
- [x] Design documentation committed

### Configuration

**Repository**: https://github.com/DeadshotOMEGA/sentinel

**MCP Servers** (configured in user settings):
- `github` - Repository operations, issues, PRs
- `monday` - Board management, task tracking

**Project Tracking**:
- Use Monday.com for phase tracking and task management
- Create board items for each implementation phase
- Update status as work progresses

---

## Phase 1: Foundation & Core Data Model

**Goal**: Establish database schema, authentication, and core business logic for member management.

**Deliverables**:
- PostgreSQL database schema with migrations
- Redis configuration for caching and sessions
- Core TypeScript types and interfaces
- Basic authentication system
- Database seed scripts for development

### Technical Tasks

#### 1.1 Database Schema Design

**Files to Create**:
- `/backend/db/schema.sql`
- `/backend/db/migrations/001_initial_schema.sql`
- `/backend/db/seed/dev-data.sql`

**Tables**:

```sql
-- Members (Full-Time Staff + Reserve Members)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_number VARCHAR(20) UNIQUE NOT NULL,
  rank VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  division_id UUID REFERENCES divisions(id),
  member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('full_time', 'reserve')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Divisions (Operations, Admin, Training, Command)
CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Badges (NFC cards assigned to members)
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number VARCHAR(100) UNIQUE NOT NULL, -- NFC UID
  assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('member', 'event', 'unassigned')),
  assigned_to_id UUID, -- Member ID or Event Attendee ID
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'lost', 'returned')),
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Check-ins (attendance events)
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  badge_id UUID REFERENCES badges(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('in', 'out')),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  kiosk_id VARCHAR(50) NOT NULL,
  synced BOOLEAN DEFAULT true, -- false for offline queue items
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_checkins_member_timestamp ON checkins(member_id, timestamp DESC);
CREATE INDEX idx_checkins_timestamp ON checkins(timestamp DESC);

-- Visitors (non-member building access)
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  organization VARCHAR(200),
  visit_type VARCHAR(50) NOT NULL CHECK (visit_type IN ('general', 'contractor', 'recruitment', 'course', 'event', 'official', 'other')),
  visit_reason TEXT,
  event_id UUID REFERENCES events(id), -- if visit_type = 'event'
  host_member_id UUID REFERENCES members(id),
  check_in_time TIMESTAMP NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMP,
  temporary_badge_id UUID REFERENCES badges(id),
  kiosk_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_visitors_check_in_time ON visitors(check_in_time DESC);

-- Admin Users (dashboard access)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'viewer')),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log (track all admin actions)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_log_admin_created ON audit_log(admin_user_id, created_at DESC);
```

**Complexity**: M
**Estimated Time**: 3-4 days

#### 1.2 TypeScript Type Definitions

**Files to Create**:
- `/shared/types/member.ts`
- `/shared/types/badge.ts`
- `/shared/types/checkin.ts`
- `/shared/types/visitor.ts`
- `/shared/types/admin.ts`
- `/shared/types/api.ts`

**Example**:
```typescript
// /shared/types/member.ts
export type MemberType = 'full_time' | 'reserve';
export type MemberStatus = 'active' | 'inactive';

export interface Member {
  id: string;
  serviceNumber: string;
  rank: string;
  firstName: string;
  lastName: string;
  divisionId: string;
  memberType: MemberType;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberWithDivision extends Member {
  division: {
    id: string;
    name: string;
    code: string;
  };
}

export interface MemberPresence extends MemberWithDivision {
  currentStatus: 'present' | 'absent';
  lastCheckIn?: Date;
  lastCheckOut?: Date;
}
```

**Complexity**: S
**Estimated Time**: 2-3 days

#### 1.3 Authentication System

**Files to Create**:
- `/backend/auth/password.ts` (bcrypt hashing)
- `/backend/auth/session.ts` (Redis session storage)
- `/backend/auth/middleware.ts` (auth guards)

**Dependencies**: `bcrypt`, `jsonwebtoken`, `ioredis`

**Complexity**: M
**Estimated Time**: 3-4 days

#### 1.4 Database Connection & ORM Setup

**Files to Create**:
- `/backend/db/connection.ts` (PostgreSQL pool)
- `/backend/db/repositories/member-repository.ts`
- `/backend/db/repositories/badge-repository.ts`
- `/backend/db/repositories/checkin-repository.ts`
- `/backend/db/repositories/visitor-repository.ts`

**Dependencies**: `pg`, `ioredis`

**Complexity**: M
**Estimated Time**: 4-5 days

### Testing Requirements

- [ ] Database migrations run cleanly on fresh DB
- [ ] Seed data populates without errors
- [ ] Type checking passes (`bun run tsc`)
- [ ] Repository methods correctly map database rows to TypeScript objects
- [ ] Authentication creates sessions and validates passwords
- [ ] Can create admin user and login via test script

### Phase 1 Checklist

- [ ] PostgreSQL installed and configured on development machine
- [ ] Redis installed and running
- [ ] Database schema created with all tables and indexes
- [ ] TypeScript types defined for all entities
- [ ] Repository pattern implemented for data access
- [ ] Authentication middleware functional
- [ ] Seed script creates test data (20+ members, 5 divisions, 50+ badges)
- [ ] Integration test suite passes

---

## Phase 2: Backend API & WebSocket Infrastructure

**Goal**: Build RESTful API and WebSocket server for real-time updates.

**Deliverables**:
- Express.js API server with all endpoints
- WebSocket server for real-time presence updates
- API documentation (OpenAPI/Swagger)
- Error handling and logging infrastructure

**Dependencies**: Phase 1 complete

### Technical Tasks

#### 2.1 API Server Setup

**Files to Create**:
- `/backend/server.ts` (main entry point)
- `/backend/routes/index.ts` (route aggregation)
- `/backend/middleware/error-handler.ts`
- `/backend/middleware/logger.ts`
- `/backend/middleware/cors.ts`

**Dependencies**: `express`, `helmet`, `cors`, `compression`, `winston`

**Complexity**: M
**Estimated Time**: 2-3 days

#### 2.2 Member Management Endpoints

**Files to Create**:
- `/backend/routes/members.ts`
- `/backend/controllers/member-controller.ts`
- `/backend/services/member-service.ts`

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members` | List all members (with filters, pagination) |
| GET | `/api/members/:id` | Get single member details |
| POST | `/api/members` | Create new member |
| PUT | `/api/members/:id` | Update member details |
| DELETE | `/api/members/:id` | Deactivate member |
| GET | `/api/members/:id/history` | Get check-in history |

**Complexity**: M
**Estimated Time**: 3-4 days

#### 2.3 Check-In Endpoints

**Files to Create**:
- `/backend/routes/checkins.ts`
- `/backend/controllers/checkin-controller.ts`
- `/backend/services/checkin-service.ts`

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/checkin` | Record single badge scan |
| POST | `/api/checkin/bulk` | Sync offline queue (batch upload) |
| GET | `/api/presence` | Get current presence status for all members |
| GET | `/api/presence/stats` | Get aggregate stats (present count, etc.) |

**Business Logic**:
- Automatic direction detection (check-in vs check-out based on current state)
- Timestamp validation (reject future timestamps)
- Duplicate scan prevention (within 5-second window)

**Complexity**: M
**Estimated Time**: 3-4 days

#### 2.4 Visitor Management Endpoints

**Files to Create**:
- `/backend/routes/visitors.ts`
- `/backend/controllers/visitor-controller.ts`
- `/backend/services/visitor-service.ts`

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/visitors` | List visitors (with date filters) |
| POST | `/api/visitors` | Record visitor sign-in |
| PUT | `/api/visitors/:id/checkout` | Record visitor sign-out |
| GET | `/api/visitors/current` | Get all currently signed-in visitors |

**Complexity**: S
**Estimated Time**: 2-3 days

#### 2.5 Division & Badge Management Endpoints

**Files to Create**:
- `/backend/routes/divisions.ts`
- `/backend/routes/badges.ts`

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/divisions` | List all divisions |
| POST | `/api/divisions` | Create division |
| PUT | `/api/divisions/:id` | Update division |
| GET | `/api/badges` | List all badges (with status filter) |
| POST | `/api/badges` | Register new badge |
| PUT | `/api/badges/:id/assign` | Assign badge to member |
| PUT | `/api/badges/:id/unassign` | Unassign badge |

**Complexity**: S
**Estimated Time**: 2 days

#### 2.6 WebSocket Server

**Files to Create**:
- `/backend/websocket/server.ts`
- `/backend/websocket/events.ts`
- `/backend/websocket/rooms.ts`

**Events**:

| Event | Direction | Payload |
|-------|-----------|---------|
| `checkin` | Server → Client | `{ memberId, name, direction, timestamp }` |
| `presence_update` | Server → Client | `{ stats: { present, absent, visitors } }` |
| `visitor_signin` | Server → Client | `{ visitorId, name, checkInTime }` |
| `kiosk_status` | Client → Server | `{ kioskId, status, queueSize }` |

**Dependencies**: `socket.io`

**Complexity**: M
**Estimated Time**: 3-4 days

#### 2.7 Error Handling & Logging

**Files to Create**:
- `/backend/utils/logger.ts` (Winston configuration)
- `/backend/utils/errors.ts` (custom error classes)
- `/backend/middleware/error-handler.ts`

**Error Response Format**:
```json
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "Member with ID abc-123 not found",
    "details": "This member may have been removed or the ID is incorrect.",
    "howToFix": "Check the member list and try again with a valid member ID."
  }
}
```

**Complexity**: S
**Estimated Time**: 2 days

### Testing Requirements

- [ ] All API endpoints return correct HTTP status codes
- [ ] Validation errors return helpful messages
- [ ] WebSocket connections establish successfully
- [ ] WebSocket events broadcast to all connected clients
- [ ] Error responses follow consistent format
- [ ] Authentication middleware protects admin-only endpoints
- [ ] API documentation is accurate and complete
- [ ] Load testing handles 100+ concurrent connections

### Phase 2 Checklist

- [ ] Express server starts without errors
- [ ] All REST endpoints functional and tested
- [ ] WebSocket server accepts connections
- [ ] Real-time events broadcast correctly
- [ ] Error handling provides clear, actionable messages
- [ ] Logging captures all requests and errors
- [ ] API documentation generated (Swagger/OpenAPI)
- [ ] Postman collection created for manual testing

---

## Phase 3: Admin Dashboard (Core Features)

**Goal**: Build web-based administration interface for member management, visitor tracking, and reporting.

**Deliverables**:
- React application with HeroUI Pro components
- Member CRUD interface
- Real-time presence dashboard
- Visitor log
- Basic reporting

**Dependencies**: Phase 1, 2 complete

### Technical Tasks

#### 3.1 Project Setup & Build Configuration

**Files to Create**:
- `/frontend/package.json`
- `/frontend/tsconfig.json`
- `/frontend/vite.config.ts`
- `/frontend/tailwind.config.ts`
- `/frontend/heroui-theme-config.ts`

**Dependencies**:
- `react`, `react-dom`, `react-router-dom`
- `@heroui/react`, `@heroui/pro`
- `tailwindcss`, `autoprefixer`
- `axios`, `socket.io-client`
- `zustand` (state management)
- `react-query` (data fetching)
- `date-fns` (date formatting)

**Complexity**: S
**Estimated Time**: 1-2 days

#### 3.2 Theme Configuration

**Files to Create**:
- `/frontend/src/styles/theme.ts` (HeroUI theme customization)
- `/frontend/src/styles/global.css` (Tailwind base styles)

**Theme Tokens**:
```typescript
const theme = {
  colors: {
    primary: '#007fff',      // Azure Blue
    accent: '#ff8000',       // Orange
    success: '#10b981',      // Green
    warning: '#f59e0b',      // Yellow
    error: '#ef4444',        // Red
  },
  fonts: {
    sans: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  // WCAG AA compliant contrast ratios
}
```

**Complexity**: S
**Estimated Time**: 1 day

#### 3.3 Authentication UI

**Files to Create**:
- `/frontend/src/pages/Login.tsx`
- `/frontend/src/hooks/useAuth.ts`
- `/frontend/src/context/AuthContext.tsx`

**HeroUI Components**: `Simple Login` (Pro)

**Features**:
- Username/password form
- "Remember me" checkbox
- Session persistence in localStorage
- Automatic redirect to dashboard on success
- Error display for invalid credentials

**Complexity**: S
**Estimated Time**: 2 days

#### 3.4 Layout Shell

**Files to Create**:
- `/frontend/src/layouts/DashboardLayout.tsx`
- `/frontend/src/components/Sidebar.tsx`
- `/frontend/src/components/TopBar.tsx`

**HeroUI Components**:
- `Sidebar With Sections` (Pro)
- `Sidebar With User Avatar` (Pro)
- `Navigation Headers` (Pro)

**Navigation Structure**:
- Dashboard (home)
- Members
- Visitors
- Reports
- --- (divider)
- Import Data
- Settings

**Complexity**: M
**Estimated Time**: 3-4 days

#### 3.5 Dashboard Home Page

**Files to Create**:
- `/frontend/src/pages/Dashboard.tsx`
- `/frontend/src/components/PresenceStats.tsx`
- `/frontend/src/components/RecentActivity.tsx`

**HeroUI Components**: `KPI Stats` (Pro)

**Features**:
- 3 KPI cards: Present, Absent, Visitors
- Recent activity feed (last 10 check-ins)
- Real-time WebSocket updates

**Complexity**: M
**Estimated Time**: 3-4 days

#### 3.6 Members Management

**Files to Create**:
- `/frontend/src/pages/Members.tsx`
- `/frontend/src/components/MemberTable.tsx`
- `/frontend/src/components/MemberModal.tsx`
- `/frontend/src/components/MemberFilters.tsx`

**HeroUI Components**:
- `Table With Filters` (Pro)
- `Modal` (base) + `Forms` (Pro)

**Features**:
- Searchable, sortable, filterable member list
- Add/Edit member modal
- Bulk selection for actions
- Pagination (25 per page)
- Export to CSV

**Complexity**: L
**Estimated Time**: 5-6 days

#### 3.7 Visitor Log

**Files to Create**:
- `/frontend/src/pages/Visitors.tsx`
- `/frontend/src/components/VisitorTable.tsx`
- `/frontend/src/components/ManualVisitorEntry.tsx`

**HeroUI Components**: `Table With Filters` (Pro)

**Features**:
- List all visitors with date filters
- Show current/historical visitors
- Manual visitor entry form
- Sign-out visitors from dashboard
- Visit type categorization

**Complexity**: M
**Estimated Time**: 3-4 days

#### 3.8 Basic Reports

**Files to Create**:
- `/frontend/src/pages/Reports.tsx`
- `/frontend/src/components/AttendanceReport.tsx`
- `/frontend/src/components/ReportFilters.tsx`

**HeroUI Components**:
- `Tabs` (base)
- `KPI Stats` (Pro)
- `Bars And Circles` (Pro)

**Reports**:
- Attendance summary (date range, division filters)
- Member check-in history
- Visitor analytics
- CSV export

**Complexity**: M
**Estimated Time**: 4-5 days

#### 3.9 Settings Page

**Files to Create**:
- `/frontend/src/pages/Settings.tsx`
- `/frontend/src/components/GeneralSettings.tsx`
- `/frontend/src/components/DivisionSettings.tsx`
- `/frontend/src/components/BadgeManagement.tsx`

**HeroUI Components**:
- `Tabs` (base)
- `Forms` (Pro)
- `Table` (base)

**Settings Sections**:
- General (unit name, timezone, auto sign-out time)
- Divisions (add/edit/delete divisions)
- Badges (view badge pool, assign/unassign)
- Users (admin user management)

**Complexity**: M
**Estimated Time**: 4-5 days

### Testing Requirements

- [ ] All pages render without errors
- [ ] Authentication flow works (login, session, logout)
- [ ] CRUD operations complete successfully
- [ ] Real-time updates appear in dashboard
- [ ] Forms validate input and show errors
- [ ] Responsive design works on tablet (1024px+)
- [ ] WCAG AA contrast ratios verified
- [ ] Keyboard navigation functional
- [ ] Screen reader compatibility tested

### Phase 3 Checklist

- [ ] Development server runs (`bun run dev`)
- [ ] Production build succeeds (`bun run build`)
- [ ] Authentication UI complete and functional
- [ ] Dashboard layout with sidebar navigation
- [ ] Member management CRUD fully operational
- [ ] Visitor log displays and filters correctly
- [ ] Reports generate with accurate data
- [ ] Settings page saves configuration
- [ ] WebSocket integration updates UI in real-time
- [ ] Error handling displays user-friendly messages

---

## Phase 4: Kiosk Interface & NFC Integration

**Goal**: Build touch-optimized kiosk UI and integrate with PN532 NFC hardware.

**Deliverables**:
- Kiosk web interface with 56px touch targets
- NFC reader daemon for Raspberry Pi
- Badge scanning flow with audio/visual feedback
- Visitor sign-in interface

**Dependencies**: Phase 1, 2 complete

### Technical Tasks

#### 4.1 Kiosk React Application

**Files to Create**:
- `/kiosk/src/App.tsx`
- `/kiosk/src/pages/IdleScreen.tsx`
- `/kiosk/src/pages/ScanSuccess.tsx`
- `/kiosk/src/pages/ScanError.tsx`
- `/kiosk/src/pages/VisitorSignIn.tsx`

**Custom CSS**:
```css
.kiosk-mode {
  min-height: 56px;
  min-width: 56px;
  font-size: 1.125rem;
  cursor: default;
}

.kiosk-mode button {
  min-height: 56px;
  min-width: 56px;
  padding: 1rem 1.5rem;
  font-size: 1.25rem;
}

.kiosk-mode input {
  height: 56px;
  font-size: 1.125rem;
  padding: 0 1rem;
}
```

**Complexity**: M
**Estimated Time**: 4-5 days

#### 4.2 NFC Reader Daemon (Raspberry Pi)

**Files to Create**:
- `/hardware/nfc-daemon/main.ts`
- `/hardware/nfc-daemon/pn532.ts` (NFC reader interface)
- `/hardware/nfc-daemon/api-client.ts` (POST to backend)

**Dependencies**: `nfc-pcsc`, `axios`

**Flow**:
1. Poll PN532 HAT for NFC cards (100ms interval)
2. On card detected, read UID
3. POST to `/api/checkin` with `{ badgeId: UID, kioskId, timestamp }`
4. Receive response (member name, direction, status)
5. Display result on kiosk screen (via IPC or HTTP)

**Daemon Install**:
```bash
# Install as systemd service on Pi
sudo systemctl enable nfc-daemon
sudo systemctl start nfc-daemon
```

**Complexity**: M
**Estimated Time**: 5-6 days

#### 4.3 Kiosk State Machine

**Files to Create**:
- `/kiosk/src/state/kiosk-state.ts`

**States**:
- `IDLE` - "Tap Your Badge" screen
- `SCANNING` - Processing badge scan
- `SUCCESS` - Show member name, rank, direction, time (3 seconds)
- `ERROR` - Show error message (5 seconds)
- `VISITOR_MODE` - Visitor sign-in flow

**Transitions**:
```
IDLE → (badge detected) → SCANNING
SCANNING → (valid badge) → SUCCESS → (3s timeout) → IDLE
SCANNING → (invalid badge) → ERROR → (5s timeout) → IDLE
IDLE → (visitor button pressed) → VISITOR_MODE
VISITOR_MODE → (form submitted) → SUCCESS → IDLE
```

**Complexity**: M
**Estimated Time**: 3-4 days

#### 4.4 Audio Feedback

**Files to Create**:
- `/kiosk/public/sounds/success.mp3`
- `/kiosk/public/sounds/error.mp3`
- `/kiosk/src/utils/audio.ts`

**Sounds**:
- Success: Pleasant chime (0.5s)
- Error: Alert tone (0.3s)

**Implementation**:
```typescript
const playSound = (type: 'success' | 'error') => {
  const audio = new Audio(`/sounds/${type}.mp3`);
  audio.play();
};
```

**Complexity**: S
**Estimated Time**: 1 day

#### 4.5 Visitor Sign-In Flow

**Files to Create**:
- `/kiosk/src/pages/VisitorType.tsx`
- `/kiosk/src/pages/VisitorDetails.tsx`
- `/kiosk/src/pages/VisitorConfirmation.tsx`

**HeroUI Components**: Base components only (Button, Input, Select)

**Flow**:
1. Select visit type (Meeting, Work, Recruitment, Course, Event, Other)
2. If "Event" selected, choose from active events
3. Enter visitor details (name, organization, host member)
4. Confirmation screen

**Complexity**: M
**Estimated Time**: 4-5 days

#### 4.6 Kiosk Configuration

**Files to Create**:
- `/kiosk/kiosk-config.json`

**Configuration Options**:
```json
{
  "kioskId": "primary-entrance",
  "apiUrl": "http://192.168.1.100:3000",
  "visitorModeEnabled": true,
  "soundEnabled": true,
  "idleTimeout": 30000,
  "successScreenDuration": 3000,
  "errorScreenDuration": 5000
}
```

**Complexity**: S
**Estimated Time**: 1 day

### Hardware Setup

#### Raspberry Pi Configuration

**Hardware**:
- Raspberry Pi 5 (8GB RAM)
- Waveshare PN532 NFC HAT
- GeeekPi 10.1" Capacitive Touchscreen (1280x800)

**Software Installation**:
```bash
# Install Node.js, Bun, Chromium
sudo apt update
sudo apt install -y chromium-browser unclutter

# Install NFC libraries
sudo apt install -y libnfc-bin libnfc-dev

# Configure kiosk to auto-start on boot
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
# Add:
# @chromium-browser --kiosk --disable-infobars http://localhost:5173
# @unclutter -idle 0.1
```

**Complexity**: M
**Estimated Time**: 2-3 days (per device)

### Testing Requirements

- [ ] NFC daemon detects PN532 HAT successfully
- [ ] Badge scans trigger API calls within 500ms
- [ ] Kiosk UI displays success/error states correctly
- [ ] Audio plays for success/error events
- [ ] Touch targets are minimum 56px
- [ ] Visitor sign-in flow completes successfully
- [ ] Kiosk runs in fullscreen kiosk mode
- [ ] Auto-restart on crash (systemd service)

### Phase 4 Checklist

- [ ] Kiosk React app built and deployed
- [ ] NFC daemon installed as systemd service
- [ ] PN532 NFC HAT detected and functional
- [ ] Badge scanning triggers check-in/out
- [ ] Success/error screens display correctly
- [ ] Audio feedback plays on scan
- [ ] Visitor sign-in flow operational
- [ ] Kiosk auto-starts on Pi boot
- [ ] Touchscreen calibrated and responsive
- [ ] Reduced animations enabled for Pi performance

---

## Phase 5: Offline Queue & Sync System

**Goal**: Implement offline-first architecture so kiosks continue operating when network is unavailable.

**Deliverables**:
- Local queue storage (IndexedDB)
- Automatic sync when connection restored
- Conflict resolution logic
- Status indicators (online/offline/syncing)

**Dependencies**: Phase 2, 4 complete

### Technical Tasks

#### 5.1 Offline Queue Storage (Kiosk)

**Files to Create**:
- `/kiosk/src/db/queue.ts` (IndexedDB wrapper)
- `/kiosk/src/services/offline-queue.ts`

**IndexedDB Schema**:
```typescript
interface QueuedCheckin {
  id: string; // UUID
  badgeId: string;
  kioskId: string;
  timestamp: Date;
  retryCount: number;
  createdAt: Date;
}
```

**Operations**:
- `enqueue(checkin)` - Add to queue
- `dequeue()` - Get oldest item
- `clear()` - Empty queue after successful sync
- `getSize()` - Count queued items

**Complexity**: M
**Estimated Time**: 3-4 days

#### 5.2 Network Status Detection

**Files to Create**:
- `/kiosk/src/hooks/useNetworkStatus.ts`
- `/kiosk/src/components/NetworkIndicator.tsx`

**Status Detection**:
```typescript
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also ping API every 30s to verify backend reachability
    const interval = setInterval(async () => {
      try {
        await fetch('/api/health', { timeout: 5000 });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
};
```

**Complexity**: S
**Estimated Time**: 2 days

#### 5.3 Sync Service

**Files to Create**:
- `/kiosk/src/services/sync-service.ts`

**Logic**:
1. On network reconnect, check queue size
2. If queue not empty, POST to `/api/checkin/bulk` with array
3. Backend validates timestamps and deduplicates
4. On success, clear queue
5. On failure, retry with exponential backoff (5s, 15s, 45s, 2m)

**Bulk Upload Endpoint**:
```typescript
// POST /api/checkin/bulk
{
  checkins: [
    { badgeId: 'abc', kioskId: 'primary', timestamp: '2025-01-15T09:35:22Z' },
    { badgeId: 'def', kioskId: 'primary', timestamp: '2025-01-15T09:36:10Z' },
    // ... up to 100 per batch
  ]
}

// Response
{
  success: 95,
  failed: 5,
  errors: [
    { index: 3, reason: 'Future timestamp rejected' },
    { index: 7, reason: 'Duplicate scan within 5 seconds' }
  ]
}
```

**Complexity**: M
**Estimated Time**: 4-5 days

#### 5.4 Backend Conflict Resolution

**Files to Create**:
- `/backend/services/sync-service.ts`
- `/backend/utils/timestamp-validator.ts`

**Validation Rules**:
- Reject timestamps in the future
- Reject timestamps older than 7 days
- Deduplicate: If same badge + kiosk within 5 seconds, keep earliest
- Sort by timestamp before inserting (preserve chronological order)

**Complexity**: M
**Estimated Time**: 3-4 days

#### 5.5 UI Status Indicators

**Files to Create**:
- `/kiosk/src/components/SyncStatus.tsx`

**States**:
- **Online**: Green badge "Connected"
- **Offline**: Yellow badge "Offline - Queue: 23"
- **Syncing**: Blue badge with spinner "Syncing... 23/45"

**Position**: Top-right corner of kiosk screen

**Complexity**: S
**Estimated Time**: 1-2 days

### Testing Requirements

- [ ] Network disconnection triggers offline mode
- [ ] Check-ins saved to IndexedDB when offline
- [ ] Queue persists across kiosk app restarts
- [ ] Sync automatically triggers when network restored
- [ ] Bulk upload succeeds with 100+ queued items
- [ ] Duplicate scans filtered correctly
- [ ] UI indicators reflect current state accurately
- [ ] Stress test: 1000 offline scans sync correctly

### Phase 5 Checklist

- [ ] IndexedDB queue implemented and tested
- [ ] Network status detection functional
- [ ] Sync service automatically uploads queue
- [ ] Backend bulk endpoint handles batches correctly
- [ ] Conflict resolution prevents duplicates
- [ ] UI status indicators display online/offline/syncing
- [ ] Offline queue capacity supports 10,000+ events
- [ ] Sync retries with exponential backoff
- [ ] Admin dashboard shows kiosk sync status

---

## Phase 6: TV Display & Real-Time Updates

**Goal**: Create large-format passive display for wall-mounted screens.

**Deliverables**:
- TV display interface (10-foot UI)
- Real-time presence overview
- Activity feed with auto-scroll
- Configurable display modes

**Dependencies**: Phase 2, 3 complete

### Technical Tasks

#### 6.1 TV Display React Application

**Files to Create**:
- `/tv-display/src/App.tsx`
- `/tv-display/src/pages/PresenceView.tsx`
- `/tv-display/src/components/Clock.tsx`
- `/tv-display/src/components/PresenceCards.tsx`
- `/tv-display/src/components/ActivityFeed.tsx`

**Custom CSS**:
```css
.tv-mode {
  cursor: default;
  font-size: 2rem;
}

.tv-mode .kpi-stat-value {
  font-size: 5rem;
  font-weight: 700;
}

.tv-mode .kpi-stat-label {
  font-size: 1.5rem;
}

/* No hover states */
.tv-mode button:hover,
.tv-mode a:hover {
  background-color: inherit;
  transform: none;
}
```

**Complexity**: M
**Estimated Time**: 3-4 days

#### 6.2 Real-Time Data Integration

**Files to Create**:
- `/tv-display/src/hooks/usePresenceData.ts`
- `/tv-display/src/hooks/useActivityFeed.ts`

**WebSocket Subscription**:
```typescript
const usePresenceData = () => {
  const [stats, setStats] = useState({ present: 0, absent: 0, visitors: 0 });

  useEffect(() => {
    const socket = io(API_URL);

    socket.on('presence_update', (data) => {
      setStats(data.stats);
    });

    return () => socket.disconnect();
  }, []);

  return stats;
};
```

**Complexity**: S
**Estimated Time**: 2 days

#### 6.3 Clock Display

**Files to Create**:
- `/tv-display/src/components/Clock.tsx`

**Features**:
- Large monospace time (HH:MM:SS)
- Date display (Day, Month DD, YYYY)
- Auto-update every second

**Complexity**: S
**Estimated Time**: 1 day

#### 6.4 Activity Feed with Auto-Scroll

**Files to Create**:
- `/tv-display/src/components/ActivityFeed.tsx`

**Features**:
- Show last 10 check-ins
- Auto-scroll with smooth animations
- Fade in new items
- Color-code: Green (check-in), Orange (check-out), Blue (visitor)

**Complexity**: S
**Estimated Time**: 2 days

#### 6.5 Display Modes

**Files to Create**:
- `/tv-display/tv-config.json`

**Modes**:
1. **Unit Overview** - All members present/absent
2. **Division Split** - Show stats per division
3. **Combined (Unit + Event)** - Two-column layout for active events
4. **Event-Only** - Single event attendance

**Configuration**:
```json
{
  "displayMode": "unit-overview",
  "refreshInterval": 60000,
  "activityFeedEnabled": true,
  "eventId": null
}
```

**Complexity**: M
**Estimated Time**: 3-4 days

### Testing Requirements

- [ ] TV display renders in fullscreen without chrome
- [ ] Clock updates accurately every second
- [ ] Presence stats update in real-time via WebSocket
- [ ] Activity feed scrolls smoothly
- [ ] No hover states or interactive elements
- [ ] Display readable from 10 feet away
- [ ] Auto-reconnect on WebSocket disconnect
- [ ] Runs continuously for 24+ hours without memory leaks

### Phase 6 Checklist

- [ ] TV display app built and deployed
- [ ] Real-time WebSocket integration functional
- [ ] Clock displays current time/date
- [ ] Presence stats update automatically
- [ ] Activity feed shows recent check-ins
- [ ] Multiple display modes implemented
- [ ] Configuration file controls display behavior
- [ ] TV display auto-starts on boot (kiosk mode)
- [ ] Performance optimized for Raspberry Pi
- [ ] Large text readable from 10+ feet

---

## Phase 7: Events & Temporary Groups Feature

**Goal**: Support special events with temporary building access for non-unit personnel.

**Deliverables**:
- Event CRUD interface
- Event attendee management with Excel import
- Badge assignment workflow
- Event-specific monitoring views
- Badge recovery tracking

**Dependencies**: Phase 1-4 complete

### Technical Tasks

#### 7.1 Event Data Model (Database)

**Files to Create**:
- `/backend/db/migrations/007_events.sql`

**Tables**:

```sql
-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  auto_expire_badges BOOLEAN DEFAULT true,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Event Attendees
CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  rank VARCHAR(50),
  organization VARCHAR(200) NOT NULL,
  role VARCHAR(100) NOT NULL,
  badge_id UUID REFERENCES badges(id),
  badge_assigned_at TIMESTAMP,
  access_start DATE,
  access_end DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'checked_out', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);

-- Event Check-ins (separate from member check-ins)
CREATE TABLE event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_attendee_id UUID REFERENCES event_attendees(id),
  badge_id UUID REFERENCES badges(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('in', 'out')),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  kiosk_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_event_checkins_attendee ON event_checkins(event_attendee_id, timestamp DESC);
```

**Complexity**: M
**Estimated Time**: 2-3 days

#### 7.2 Event API Endpoints

**Files to Create**:
- `/backend/routes/events.ts`
- `/backend/controllers/event-controller.ts`
- `/backend/services/event-service.ts`

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List all events (with status filter) |
| GET | `/api/events/:id` | Get event details |
| POST | `/api/events` | Create new event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Cancel event |
| GET | `/api/events/:id/attendees` | List event attendees |
| POST | `/api/events/:id/attendees` | Add attendee manually |
| PUT | `/api/events/:id/attendees/:attendeeId` | Update attendee |
| DELETE | `/api/events/:id/attendees/:attendeeId` | Remove attendee |
| POST | `/api/events/:id/attendees/import` | Import attendees from Excel/CSV |
| PUT | `/api/events/:id/attendees/:attendeeId/assign-badge` | Assign badge |
| POST | `/api/events/:id/close` | End event and expire badges |
| GET | `/api/events/:id/presence` | Get current attendance |
| GET | `/api/events/:id/reports/attendance` | Attendance report |

**Complexity**: L
**Estimated Time**: 5-6 days

#### 7.3 Admin UI - Events List

**Files to Create**:
- `/frontend/src/pages/Events.tsx`
- `/frontend/src/components/EventCard.tsx`
- `/frontend/src/components/EventModal.tsx`

**HeroUI Components**:
- `Table With Filters` (Pro)
- `Cards` (Pro)
- `Modal` + `Forms` (Pro)

**Features**:
- List events with filters (Active, Upcoming, Completed)
- Create/edit event modal
- Event status badges
- Quick stats (attendee count, present count)

**Complexity**: M
**Estimated Time**: 4-5 days

#### 7.4 Admin UI - Event Detail & Attendee Management

**Files to Create**:
- `/frontend/src/pages/EventDetail.tsx`
- `/frontend/src/components/AttendeeTable.tsx`
- `/frontend/src/components/AddAttendeeModal.tsx`
- `/frontend/src/components/BadgeAssignmentModal.tsx`

**HeroUI Components**: `Table With Filters` (Pro)

**Features**:
- Attendee list with search/filter
- Add attendee manually
- Assign badge (scan or select from pool)
- Bulk badge assignment
- View attendee check-in history

**Complexity**: L
**Estimated Time**: 6-7 days

#### 7.5 Excel/CSV Import for Event Attendees

**Files to Create**:
- `/frontend/src/pages/EventAttendeeImport.tsx`
- `/backend/services/event-import-service.ts`

**HeroUI Components**: `Vertical Stepper With Helpers` (Pro)

**Flow** (same as nominal roll import):
1. Upload file
2. Map columns (Name, Rank, Organization, Role, Access Start/End)
3. Preview changes
4. Confirm import

**Expected Columns**:
- Name (required)
- Rank (optional)
- Organization (required)
- Role (required)
- Access Start (optional, defaults to event start)
- Access End (optional, defaults to event end)

**Complexity**: M
**Estimated Time**: 5-6 days

#### 7.6 Event Monitoring View

**Files to Create**:
- `/frontend/src/pages/EventMonitor.tsx`
- `/frontend/src/components/EventPresenceStats.tsx`
- `/frontend/src/components/EventAttendeeList.tsx`

**HeroUI Components**: `KPI Stats` (Pro)

**Features**:
- Real-time presence stats (Present, Away, Pending)
- Filter by role, organization
- Check-in/out times
- WebSocket updates for event check-ins

**Complexity**: M
**Estimated Time**: 4-5 days

#### 7.7 TV Display - Event Mode

**Files to Create**:
- `/tv-display/src/pages/EventView.tsx`
- `/tv-display/src/components/EventPresenceCards.tsx`

**Display Modes**:
1. **Combined View**: Unit members (left) + Event (right)
2. **Event-Only View**: Single event full-screen

**Complexity**: M
**Estimated Time**: 3-4 days

#### 7.8 Kiosk - Event Visitor Sign-In Integration

**Files to Create**:
- `/kiosk/src/pages/EventSelection.tsx`
- `/kiosk/src/services/event-service.ts`

**Flow**:
1. Visitor selects "Special Event" visit type
2. Choose from active events
3. If pre-registered, scan badge → normal check-in
4. If walk-in, enter details → link to event

**Complexity**: M
**Estimated Time**: 3-4 days

#### 7.9 Badge Recovery Workflow

**Files to Create**:
- `/frontend/src/pages/EventBadgeRecovery.tsx`
- `/frontend/src/components/BadgeRecoveryChecklist.tsx`

**Features**:
- List all badges assigned to event
- Mark badges as returned (scan or manual)
- Mark badges as lost
- Track outstanding badges
- Export recovery report

**Complexity**: S
**Estimated Time**: 3 days

#### 7.10 Visitor Type Enhancements

**Files to Create**:
- `/backend/routes/visit-types.ts`
- `/frontend/src/pages/VisitTypeSettings.tsx`

**Features**:
- Admin can customize visit types
- Set badge color/label for each type
- Enable/disable types
- Reports by visit type

**Complexity**: S
**Estimated Time**: 2-3 days

### Testing Requirements

- [ ] Event CRUD operations functional
- [ ] Event attendees can be added manually
- [ ] Excel import wizard works for attendees
- [ ] Badge assignment links attendee to badge
- [ ] Event check-ins record separately from unit member check-ins
- [ ] Event monitoring view shows real-time updates
- [ ] TV display can show event-specific view
- [ ] Kiosk visitor sign-in links to active events
- [ ] Badge recovery checklist tracks returns
- [ ] Auto-expiration disables badges on event end date

### Phase 7 Checklist

- [ ] Event data model created with migrations
- [ ] Event API endpoints functional
- [ ] Admin UI: Events list page complete
- [ ] Admin UI: Event detail page with attendee management
- [ ] Excel/CSV import wizard for attendees
- [ ] Badge assignment workflow operational
- [ ] Event monitoring view with real-time updates
- [ ] TV display event mode implemented
- [ ] Kiosk event visitor sign-in integrated
- [ ] Badge recovery workflow functional
- [ ] Visit type customization settings
- [ ] Event reports (attendance by day, by role)

---

## Excel Import Feature (Nominal Roll)

**Note**: This is part of Phase 3 (Admin Dashboard) but detailed separately due to complexity.

### Technical Tasks

#### Import Wizard Flow

**Files to Create**:
- `/frontend/src/pages/ImportNominalRoll.tsx`
- `/frontend/src/components/ImportStepper.tsx`
- `/frontend/src/components/ColumnMapper.tsx`
- `/frontend/src/components/ImportPreview.tsx`
- `/backend/services/import-service.ts`
- `/backend/utils/excel-parser.ts`
- `/backend/utils/fuzzy-matcher.ts`

**HeroUI Components**: `Vertical Stepper With Helpers` (Pro)

**Dependencies**: `xlsx`, `fuzzball`

#### Step 1: Upload File

**Features**:
- Drag-and-drop zone
- Accept `.xlsx`, `.xls` formats
- File size validation (max 10MB)
- Preview first 5 rows

**Endpoint**: `POST /api/import/upload`

**Complexity**: S
**Estimated Time**: 2 days

#### Step 2: Map Columns

**Features**:
- Auto-detect columns by header name
  - "Name" / "Full Name" → `name`
  - "Service Number" / "SN" → `serviceNumber`
  - "Rank" → `rank`
  - "Division" / "Section" / "Dept" → `division`
- Manual override dropdowns
- Show sample data for each column
- Validation warnings if required fields missing

**Endpoint**: `POST /api/import/map-columns`

**Complexity**: M
**Estimated Time**: 4-5 days

#### Step 3: Review Changes

**Features**:
- Show 3 tabs: New Members, Updates, Errors
- **New Members**: Will be added to database
- **Updates**: Existing members with changed fields
- **Errors**: Rows with validation issues
- For each error, show:
  - Row number
  - Issue description
  - "How to fix" guidance
  - Option to skip row or edit inline

**Example Errors**:
- "Missing required field: Service Number"
  - How to fix: Add the service number in your Excel file
- "Duplicate entry: Smith, John already exists"
  - How to fix: Remove duplicate or update existing record

**Endpoint**: `POST /api/import/preview`

**Complexity**: L
**Estimated Time**: 6-7 days

#### Step 4: Confirm Import

**Features**:
- Final summary (X new, Y updates, Z errors skipped)
- Confirmation button
- Option to download error report
- On success:
  - Apply changes to database
  - Log in audit_log
  - Create "Undo" snapshot (24-hour window)

**Endpoint**: `POST /api/import/confirm`

**Complexity**: M
**Estimated Time**: 4-5 days

#### Backend Import Logic

**Validation**:
- Service number: Unique, alphanumeric, 5-20 chars
- Rank: Match against predefined list or allow custom
- Division: Auto-create if doesn't exist (with admin approval)
- Name: Required, 2-200 chars

**Fuzzy Matching**:
- Detect potential duplicates:
  - "Smith, John" vs "John Smith" (90% match)
  - "PO1" vs "Petty Officer 1st Class" (rank synonyms)
- Show as warnings, not errors

**Transaction Safety**:
- Wrap entire import in database transaction
- Rollback if any critical error
- Partial success not allowed

**Complexity**: L
**Estimated Time**: 7-8 days

**Total for Excel Import**: 23-29 days (~1 month)

---

## Deployment & Production Readiness

### Hardware Setup

#### Backend Server (Raspberry Pi 5)

**Installation Steps**:
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone repository
git clone <repo-url> /opt/sentinel
cd /opt/sentinel/backend

# Install dependencies
bun install

# Run migrations
bun run migrate

# Create admin user
bun run create-admin

# Install as systemd service
sudo cp sentinel-backend.service /etc/systemd/system/
sudo systemctl enable sentinel-backend
sudo systemctl start sentinel-backend
```

**Systemd Service**:
```ini
[Unit]
Description=Sentinel Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=sentinel
WorkingDirectory=/opt/sentinel/backend
ExecStart=/usr/local/bin/bun run src/server.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Complexity**: M
**Estimated Time**: 1 day

#### Kiosk Devices (2x Raspberry Pi 5)

**Installation Steps**:
```bash
# Install Chromium
sudo apt install chromium-browser unclutter

# Configure auto-login and kiosk mode
sudo raspi-config
# Boot Options → Desktop / CLI → Desktop Autologin

# Install NFC libraries
sudo apt install libnfc-bin libnfc-dev

# Install NFC daemon
cd /opt/sentinel/hardware/nfc-daemon
bun install
sudo cp nfc-daemon.service /etc/systemd/system/
sudo systemctl enable nfc-daemon

# Configure autostart
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart
# Add:
# @xset s off
# @xset -dpms
# @xset s noblank
# @chromium-browser --kiosk --disable-infobars http://localhost:5173
# @unclutter -idle 0.1
```

**Complexity**: M
**Estimated Time**: 1 day per device

### Network Configuration

**Static IP Addresses**:
- Backend Server: `192.168.1.100`
- Primary Kiosk: `192.168.1.101`
- Rear Door Scanner: `192.168.1.102`

**Firewall Rules**:
```bash
# Backend server
sudo ufw allow 3000/tcp  # API
sudo ufw allow 5432/tcp  # PostgreSQL (internal only)
sudo ufw allow 6379/tcp  # Redis (internal only)
sudo ufw enable
```

**Complexity**: S
**Estimated Time**: 0.5 day

### Backup Strategy

**Automated Backups**:
```bash
# Daily PostgreSQL dump
0 2 * * * pg_dump -U sentinel sentinel_db | gzip > /backup/sentinel-$(date +\%Y\%m\%d).sql.gz

# Weekly full backup to external USB drive
0 3 * * 0 rsync -av /opt/sentinel /mnt/backup/

# Retain 30 days of daily backups, 12 weeks of weekly backups
```

**Restore Procedure**:
```bash
# Restore from backup
gunzip -c /backup/sentinel-20250115.sql.gz | psql -U sentinel sentinel_db
```

**Complexity**: S
**Estimated Time**: 1 day

---

## Testing Strategy

### Unit Tests

**Coverage Target**: 80%+

**Files to Test**:
- All repository methods
- API endpoint controllers
- Business logic services
- Import parsers and validators
- Offline queue logic

**Tools**: `bun test`, `vitest`

**Complexity**: Ongoing
**Estimated Time**: 1-2 days per phase

### Integration Tests

**Scenarios**:
- End-to-end member check-in flow
- Excel import full wizard
- Offline queue sync
- WebSocket real-time updates
- Event creation and attendee management

**Tools**: `playwright`, `supertest`

**Complexity**: M
**Estimated Time**: 5-6 days

### Hardware Tests

**Scenarios**:
- NFC badge scanning (100+ scans)
- Touchscreen responsiveness
- Audio feedback playback
- Kiosk auto-restart on crash
- 24-hour continuous operation
- Network disconnection/reconnection

**Complexity**: M
**Estimated Time**: 3-4 days

### Load Testing

**Scenarios**:
- 100 concurrent kiosks
- 1000 check-ins per minute
- 10,000 queued offline events sync
- WebSocket broadcast to 50 connected clients

**Tools**: `artillery`, `k6`

**Complexity**: M
**Estimated Time**: 2-3 days

---

## Documentation

### User Documentation

**Deliverables**:
- Admin user guide (PDF)
- Kiosk operation guide
- Troubleshooting FAQ
- Video tutorials (optional)

**Complexity**: S
**Estimated Time**: 3-4 days

### Technical Documentation

**Deliverables**:
- API reference (Swagger/OpenAPI)
- Database schema diagram
- Deployment guide
- Backup/restore procedures
- Hardware setup guide

**Complexity**: S
**Estimated Time**: 2-3 days

---

## Risk Mitigation

### Known Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| NFC hardware compatibility issues | Medium | High | Test PN532 HAT early in Phase 4 |
| Raspberry Pi performance limitations | Low | Medium | Use prefers-reduced-motion, optimize animations |
| Excel import edge cases | High | Medium | Extensive validation and error handling |
| Network reliability issues | Medium | High | Offline-first architecture (Phase 5) |
| User adoption (non-technical admins) | Medium | Medium | Clear error messages, help text, training |

---

## Success Metrics

### Phase-End Criteria

**Phase 1**:
- [ ] Database schema complete
- [ ] All migrations run successfully
- [ ] Repository tests pass

**Phase 2**:
- [ ] All API endpoints functional
- [ ] WebSocket broadcasts working
- [ ] Postman collection validates all routes

**Phase 3**:
- [ ] Admin can login and manage members
- [ ] Real-time dashboard updates
- [ ] Excel import wizard completes successfully

**Phase 4**:
- [ ] Badge scans trigger check-ins in <500ms
- [ ] Kiosk UI responsive to touch
- [ ] Audio feedback plays correctly

**Phase 5**:
- [ ] Offline queue stores 1000+ events
- [ ] Sync completes without data loss
- [ ] Network status indicators accurate

**Phase 6**:
- [ ] TV display readable from 10 feet
- [ ] Real-time updates appear within 1 second
- [ ] Runs 24+ hours without restart

**Phase 7**:
- [ ] Event CRUD functional
- [ ] Attendee import wizard works
- [ ] Badge assignment/recovery complete

### Production Acceptance

- [ ] All hardware devices operational
- [ ] 7-day continuous operation without critical errors
- [ ] Admin user training completed
- [ ] Backup/restore tested successfully
- [ ] Documentation delivered
- [ ] User acceptance testing passed

---

## Appendix: Technology Reference

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | Runtime |
| Bun | 1.0+ | Package manager, runtime |
| TypeScript | 5.0+ | Type safety |
| Express | 4.18+ | API framework |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Session storage, caching |
| Socket.IO | 4.5+ | WebSocket server |
| bcrypt | 5+ | Password hashing |
| winston | 3+ | Logging |

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18+ | UI framework |
| TypeScript | 5.0+ | Type safety |
| HeroUI Pro | Latest | Component library |
| Tailwind CSS | 3.4+ | Styling |
| Vite | 5+ | Build tool |
| React Router | 6+ | Routing |
| Zustand | 4+ | State management |
| React Query | 5+ | Data fetching |
| Socket.IO Client | 4.5+ | WebSocket client |
| Axios | 1+ | HTTP client |

### Hardware

| Component | Model | Purpose |
|-----------|-------|---------|
| Backend Server | Raspberry Pi 5 (8GB) | API + Database |
| Kiosk (Primary) | Pi 5 + PN532 HAT + Touchscreen | Badge scanning + Visitor sign-in |
| Kiosk (Rear) | Pi 5 + PN532 HAT | Badge scanning only |
| NFC Reader | Waveshare PN532 NFC HAT | Read RFID badges |
| Display | GeeekPi 10.1" Touchscreen | Kiosk interface |

---

## Contact & Support

**Project Owner**: HMCS Chippawa Administration
**Technical Lead**: TBD
**Repository**: TBD
**Issue Tracking**: TBD

---

**End of Implementation Plan**
