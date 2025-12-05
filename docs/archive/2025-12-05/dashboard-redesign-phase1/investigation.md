# Dashboard Redesign - Phase 1: Investigation

## Current State Analysis

### Component Architecture

**Dashboard Page** (`/home/sauk/projects/sentinel/frontend/src/pages/Dashboard.tsx`)
- Root container using `PageWrapper` layout component
- Manages WebSocket subscriptions for real-time updates
- Fetches presence statistics via REST API
- Maintains local activity feed state
- Renders single `ActivityPanel` component

**PageWrapper Layout** (`/home/sauk/projects/sentinel/frontend/src/components/PageWrapper.tsx`)
- Provides consistent page structure with title and optional action buttons
- Implements flex layout with proper overflow handling
- Props: `title`, `children`, `actions` (optional)

**ActivityPanel Component** (`/home/sauk/projects/sentinel/frontend/src/components/ActivityPanel.tsx`)
- Single full-width panel displaying recent activity
- Integrated filtering: type (all/members/visitors), direction (all/in/out), search
- Shows member count and visitor count chips in header
- Scrollable list of activity items with rich metadata
- Updates relative timestamps every 60 seconds
- 300ms debounced search

### Data Flow

**REST API Endpoints**
- `GET /api/checkins/presence` - Returns presence statistics
  - Response: `{ stats: PresenceStats }`
  - Fields: `totalMembers`, `present`, `absent`, `visitors`
  - Used for header statistics only

- `GET /api/checkins/presence/present` - Returns currently present members
  - Response: `{ members: Member[] }`
  - Not currently used by Dashboard

- `GET /api/visitors/active` - Returns currently signed-in visitors
  - Response: `{ visitors: Visitor[] }`
  - Not currently used by Dashboard

**WebSocket Events**
- `presence_update` - Broadcasts updated stats when member/visitor status changes
- `checkin` - Real-time member check-in/out events
- `visitor_signin` - Real-time visitor arrival events
- Activity feed built client-side from these events (last 100 items)

### Existing Type Definitions

**ActivityItem** (`shared/types/index.ts`)
```typescript
interface ActivityItem {
  type: 'checkin' | 'visitor';
  id: string;
  timestamp: string;
  direction: 'in' | 'out';
  name: string;
  rank?: string;
  division?: string;
  kioskId?: string;
  kioskName?: string;
  organization?: string;
  visitType?: string;
  visitReason?: string;
  hostName?: string;
  eventId?: string;
  eventName?: string;
}
```

**PresenceStats** (`shared/types/index.ts`)
```typescript
interface PresenceStats {
  totalMembers: number;
  present: number;
  absent: number;
  onLeave: number;
  lateArrivals: number;
  visitors: number;
}
```

**Member** (`shared/types/index.ts`)
- Full member record with `id`, `serviceNumber`, `firstName`, `lastName`, `rank`, `divisionId`, `memberType`, etc.

**Visitor** (`shared/types/index.ts`)
- Visitor record with `id`, `name`, `organization`, `visitType`, `hostMemberId`, `eventId`, `checkInTime`, `checkOutTime`

### Current Limitations

**Layout Constraints**
- Activity panel consumes entire page width
- No space for person cards or grid layout
- Header stats are read-only chips without navigation
- Filter state applies only to activity list

**Data Model**
- No unified "present person" abstraction
- Members and visitors fetched separately
- Dashboard relies on WebSocket events to build activity feed
- No REST endpoint for combined present members + active visitors

**Interaction Model**
- Activity list is view-only
- No individual person cards
- No selection or bulk actions
- No drill-down to person details

### Files to Modify

**Backend**
- `/home/sauk/projects/sentinel/backend/src/routes/checkins.ts` - Add new endpoint
- `/home/sauk/projects/sentinel/backend/src/services/presence-service.ts` - Add combined query method

**Shared Types**
- `/home/sauk/projects/sentinel/shared/types/index.ts` - Add `PresentPerson`, `DashboardFilters`

**Frontend**
- `/home/sauk/projects/sentinel/frontend/src/pages/Dashboard.tsx` - Refactor layout
- Create `/home/sauk/projects/sentinel/frontend/src/components/dashboard/DashboardHeader.tsx`
- Create `/home/sauk/projects/sentinel/frontend/src/components/dashboard/FilterBar.tsx`
- Create `/home/sauk/projects/sentinel/frontend/src/components/dashboard/PersonCard.tsx`
- Create `/home/sauk/projects/sentinel/frontend/src/components/dashboard/PersonCardGrid.tsx`
- Create `/home/sauk/projects/sentinel/frontend/src/components/dashboard/CollapsibleActivityPanel.tsx`

### Migration Path

**Preserve Existing Functionality**
- Keep WebSocket subscriptions for real-time updates
- Maintain activity feed behavior
- Retain filter logic (extract to reusable component)
- Keep presence stats polling

**New Capabilities**
- Unified person card grid view
- Collapsible activity panel
- Navigation from header chips to /members and /visitors
- Person card interactions (click to view details)
- Shared filter state across grid and activity list
