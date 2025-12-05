# Visitor & Admin Features

**Created:** 2025-12-04
**Status:** Planning

## Overview

Two related features to improve visitor management and admin operational capabilities:

1. **Visitor History Tab** - Historical visitor log in Reports for audit/compliance
2. **Manual Check-in** - Admin ability to manually check in members (forgot card) and visitors (kiosk unavailable)

---

## Feature 1: Visitor History Tab

### Use Cases
- Security audit: "Who was in the building on X date?"
- Contractor tracking: "When did ABC Corp last visit? How often?"
- Compliance reporting: Export visitor logs for specific periods

### Requirements

**Location:** Reports page → New "Visitor History" tab

**Table Columns:**
| Column | Description |
|--------|-------------|
| Name | Visitor name |
| Organization | Company/organization |
| Visit Type | contractor, recruitment, event, official, museum, other |
| Purpose | Visit reason text |
| Host | Host member name (if assigned) |
| Event | Event name (if applicable) |
| Check-In | Timestamp |
| Check-Out | Timestamp (or "Still present") |
| Duration | Calculated from check-in/out |

**Filters:**
- Date range picker (default: last 30 days)
- Visit type dropdown
- Organization search
- Host member search

**Actions:**
- Export to CSV
- Click row to view full details (modal)

### Tasks

- [ ] **Backend: Visitor history endpoint**
  - `GET /api/visitors/history` with date range, type, org filters
  - Include host member name, event name via joins
  - Pagination support
  - File: `backend/src/routes/visitors.ts`

- [ ] **Frontend: Reports Visitor History tab**
  - Add "Visitor History" tab to Reports.tsx
  - Implement date range picker component
  - Build filtered table with pagination
  - Add export CSV functionality
  - File: `frontend/src/pages/Reports.tsx`

---

## Feature 2: Manual Check-in

### Use Cases
- Member forgot badge → Admin checks them in manually
- Kiosk unavailable → Admin registers visitor from dashboard
- Audit trail shows check-ins were admin-initiated

### Requirements

#### Schema Changes

```sql
-- Migration: Add check-in method tracking

-- checkins table
ALTER TABLE checkins
  ADD COLUMN method VARCHAR(20) DEFAULT 'badge'
    CHECK (method IN ('badge', 'admin_manual'));
ALTER TABLE checkins
  ADD COLUMN created_by_admin UUID REFERENCES admin_users(id);

-- visitors table
ALTER TABLE visitors
  ADD COLUMN admin_notes TEXT;
ALTER TABLE visitors
  ADD COLUMN check_in_method VARCHAR(20) DEFAULT 'kiosk'
    CHECK (check_in_method IN ('kiosk', 'admin_manual'));
ALTER TABLE visitors
  ADD COLUMN created_by_admin UUID REFERENCES admin_users(id);
```

#### UI Changes

**FilterBar refactor:**
- Remove direction filter (All/In/Out) from FilterBar
- Add direction filter to Activity Panel header instead
- Add `[+ Check In]` dropdown button to FilterBar

**Manual Check-in dropdown options:**
1. Check In Member
2. Check In Visitor

#### Member Check-in Modal

**Flow:**
1. Admin clicks "Check In Member"
2. Modal opens with searchable member list
3. Search by name OR service number (debounced)
4. Select member → Confirm check-in
5. Creates checkin record with `method: 'admin_manual'`

**Fields:**
- Member search (autocomplete)
- Optional: reason/notes

#### Visitor Check-in Modal

**Flow:**
1. Admin clicks "Check In Visitor"
2. Modal opens with visitor form (mirrors kiosk + extras)
3. Fill out form → Submit
4. Creates visitor record with `check_in_method: 'admin_manual'`

**Fields (extended kiosk form):**
- Name (required)
- Organization (required)
- Visit Type dropdown (required)
- Purpose/Reason
- Host Member (searchable dropdown)
- Event (dropdown of active events)
- Admin Notes (new field, admin-only)

### Tasks

- [ ] **Backend: Schema migration**
  - Create migration file: `backend/db/migrations/XXX_manual_checkin.sql`
  - Update shared types: `shared/types/index.ts`
  - File: `backend/db/migrations/`

- [ ] **Backend: Manual member check-in endpoint**
  - `POST /api/checkins/manual`
  - Accepts memberId, validates member exists
  - Creates checkin with method='admin_manual', created_by_admin
  - File: `backend/src/routes/checkins.ts`

- [ ] **Backend: Manual visitor check-in endpoint**
  - `POST /api/visitors/manual`
  - Creates visitor with check_in_method='admin_manual', admin_notes
  - File: `backend/src/routes/visitors.ts`

- [ ] **Frontend: Move direction filter to Activity Panel**
  - Remove from FilterBar.tsx
  - Add to CollapsibleActivityPanel.tsx header
  - Update Dashboard.tsx state management
  - Files: `frontend/src/components/dashboard/FilterBar.tsx`, `CollapsibleActivityPanel.tsx`

- [ ] **Frontend: Add Check-in dropdown to FilterBar**
  - Dropdown button with "Check In Member" / "Check In Visitor"
  - Opens respective modals
  - File: `frontend/src/components/dashboard/FilterBar.tsx`

- [ ] **Frontend: Member Check-in Modal**
  - New component: `ManualMemberCheckinModal.tsx`
  - Member search with debounce
  - Confirmation before submit
  - File: `frontend/src/components/dashboard/ManualMemberCheckinModal.tsx`

- [ ] **Frontend: Visitor Check-in Modal**
  - New component: `ManualVisitorCheckinModal.tsx`
  - Full form matching kiosk + admin notes
  - Reuse existing form patterns
  - File: `frontend/src/components/dashboard/ManualVisitorCheckinModal.tsx`

- [ ] **Frontend: Update shared types**
  - Add CheckinMethod type
  - Update Checkin interface
  - Update Visitor interface
  - File: `shared/types/index.ts`

---

## Implementation Order

Schema migration must come first, then parallel tracks:

```
1. Schema Migration (blocks everything)
   ↓
   ├─→ 2a. Visitor History Tab (backend → frontend)
   │
   └─→ 2b. Manual Check-in (backend → frontend)
        ├─ UI refactor (FilterBar, Activity Panel)
        ├─ Member check-in modal
        └─ Visitor check-in modal
```

---

## Files Affected

| File | Changes |
|------|---------|
| `backend/db/migrations/XXX_manual_checkin.sql` | New migration |
| `backend/src/routes/checkins.ts` | Manual check-in endpoint |
| `backend/src/routes/visitors.ts` | Manual visitor + history endpoints |
| `shared/types/index.ts` | New types for method tracking |
| `frontend/src/pages/Reports.tsx` | Visitor History tab |
| `frontend/src/pages/Dashboard.tsx` | State for modals |
| `frontend/src/components/dashboard/FilterBar.tsx` | Remove direction, add Check-in button |
| `frontend/src/components/dashboard/CollapsibleActivityPanel.tsx` | Add direction filter |
| `frontend/src/components/dashboard/ManualMemberCheckinModal.tsx` | New |
| `frontend/src/components/dashboard/ManualVisitorCheckinModal.tsx` | New |
