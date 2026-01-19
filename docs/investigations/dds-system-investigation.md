# Investigation: DDS (Designated Duty Signer) System

**Goal:** Understand the complete DDS functionality from kiosk check-in through dashboard display and identify where the disconnect occurs.

---

## Key Files Involved

### Backend
- **/home/sauk/projects/sentinel/backend/src/services/dds-service.ts** (544 lines)
  - Core DDS logic: accept, assign, transfer, release
  - Database transaction handling
  - WebSocket event broadcasting

- **/home/sauk/projects/sentinel/backend/src/routes/dds.ts** (205 lines)
  - API endpoints: `/dds/current`, `/dds/status`, `/dds/accept`, `/dds/assign`, `/dds/transfer`, `/dds/release`
  - Input validation with Zod
  - Auth middleware for admin-only operations

- **/home/sauk/projects/sentinel/backend/src/websocket/broadcast.ts**
  - `broadcastDdsUpdate()` function sends to `'presence'` room

- **/home/sauk/projects/sentinel/backend/src/websocket/events.ts**
  - DDS event types and interfaces

### Kiosk (Frontend Check-in)
- **/home/sauk/projects/sentinel/kiosk/src/screens/SuccessScreen.tsx** (354 lines)
  - Shows "I am DDS today" button after check-in
  - Calls `checkDdsStatus()` to determine visibility
  - Calls `acceptDds(memberId)` on button click

- **/home/sauk/projects/sentinel/kiosk/src/lib/api.ts** (269 lines)
  - `checkDdsStatus()`: GET `/dds/status` → checks if DDS already assigned
  - `acceptDds(memberId)`: POST `/dds/accept` → member self-accepts DDS

### Dashboard (Admin UI)
- **/home/sauk/projects/sentinel/frontend/src/components/dashboard/DdsPanel.tsx** (841 lines)
  - Displays current DDS assignment
  - Admin can assign/transfer DDS via modals
  - Shows DDS acceptance time and member info

- **/home/sauk/projects/sentinel/frontend/src/hooks/useDds.ts** (114 lines)
  - Fetches current DDS via `GET /dds/current`
  - Subscribes to `'presence'` room
  - Listens for `'dds_update'` WebSocket event

- **/home/sauk/projects/sentinel/frontend/src/lib/api.ts**
  - `assignDds(memberId, notes?)`: POST `/dds/assign` (admin only)
  - `transferDds(toMemberId, notes?)`: POST `/dds/transfer` (admin only)
  - `releaseDds(notes?)`: POST `/dds/release` (admin)

### Database
- **Schema: DdsAssignment model** (lines 392-413 of schema.prisma)
- **Schema: ResponsibilityAuditLog model** (lines 415-431 of schema.prisma)

---

## Data Models & Types

### Database (Prisma)
```prisma
model DdsAssignment {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  memberId      String    @map("member_id") @db.Uuid
  assignedDate  DateTime  @map("assigned_date") @db.Date
  acceptedAt    DateTime? @map("accepted_at") @db.Timestamp(6)
  releasedAt    DateTime? @map("released_at") @db.Timestamp(6)
  transferredTo String?   @map("transferred_to") @db.Uuid
  assignedBy    String?   @map("assigned_by") @db.Uuid
  status        String    @default("pending") @db.VarChar(20)
              // Values: pending, active, released, transferred
  notes         String?
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt     DateTime  @default(now()) @map("updated_at") @db.Timestamp(6)

  member               Member     @relation("DdsMember", fields: [memberId], references: [id])
  transferredToMember  Member?    @relation("DdsTransferredTo", fields: [transferredTo], references: [id])
  assignedByAdmin      AdminUser? @relation(fields: [assignedBy], references: [id])
}

model ResponsibilityAuditLog {
  id              String   @id
  memberId        String   @map("member_id") @db.Uuid
  tagName         String   @map("tag_name") @db.VarChar(50)  // 'DDS' or 'Lockup'
  action          String   @db.VarChar(50)
                  // Values: assigned, transferred, released, self_accepted
  fromMemberId    String?  @map("from_member_id") @db.Uuid
  toMemberId      String?  @map("to_member_id") @db.Uuid
  performedBy     String?  @map("performed_by") @db.Uuid
  performedByType String   @map("performed_by_type") @db.VarChar(20)
                  // Values: 'admin' or 'member'
  timestamp       DateTime @default(now()) @db.Timestamp(6)
  notes           String?
}
```

### Backend Service Response
```typescript
// dds-service.ts - DdsAssignmentWithMember (transformed for API)
interface DdsAssignmentWithMember {
  id: string;
  memberId: string;
  assignedDate: Date;
  acceptedAt: Date | null;
  releasedAt: Date | null;
  transferredTo: string | null;
  assignedBy: string | null;
  status: string; // 'pending', 'active', 'released', 'transferred'
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  member: {
    id: string;
    name: string;       // firstName + lastName
    rank: string;
    division: string | null;
  };
  assignedByAdminName: string | null;
}
```

### Backend WebSocket Event
```typescript
// events.ts - DdsUpdateEvent (sent to 'presence' room)
export interface DdsUpdateEvent {
  assignmentId: string;
  member: DdsMemberInfo;
  status: DdsStatus;                    // 'pending' | 'active' | 'released' | 'transferred'
  assignedDate: string;                 // ISO string
  acceptedAt: string | null;            // ISO string
  assignedBy: string | null;            // Admin name
}

export interface DdsMemberInfo {
  id: string;
  name: string;                         // Full name
  rank: string;
  division: string | null;
}
```

### Frontend Dashboard Type
```typescript
// useDds.ts - DdsAssignment (for dashboard display)
export interface DdsAssignment {
  assignmentId: string;
  member: DdsMember;
  status: DdsStatus;
  assignedDate: string;                 // ISO string from WebSocket
  acceptedAt: string | null;            // ISO string from WebSocket
  assignedBy: string | null;
}

export interface DdsMember {
  id: string;
  name: string;
  rank: string;
  division: string | null;
}
```

### Kiosk API Response
```typescript
// kiosk api.ts - DdsAssignment (what kiosk expects from POST /dds/accept)
export interface DdsAssignment {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  assignedAt: string;
}
```

---

## Complete Data Flow: Kiosk DDS Selection

### 1. **Kiosk Check-in Success**
   - Location: `/home/sauk/projects/sentinel/kiosk/src/screens/SuccessScreen.tsx:20-39`
   - Trigger: Member checks in (successful badge scan)
   - Action: `useEffect` runs on mount when `isCheckingIn && checkinResult` are true
   - Call: `checkDdsStatus()` → GET `/dds/status`

### 2. **Backend Status Check**
   - Location: `/home/sauk/projects/sentinel/backend/src/routes/dds.ts:44-51`
   - Endpoint: `GET /dds/status` (PUBLIC - no auth required)
   - Code:
     ```typescript
     const hasDds = await ddsService.hasDdsForToday();
     res.json({ hasDds });
     ```
   - Service: `/home/sauk/projects/sentinel/backend/src/services/dds-service.ts:485-499`
   - Query: Looks for `DdsAssignment` with `assignedDate = today` AND `status IN ['pending', 'active']`
   - Returns: `{ hasDds: boolean }`

### 3. **Kiosk Button Visibility**
   - Location: `/home/sauk/projects/sentinel/kiosk/src/screens/SuccessScreen.tsx:27-34`
   - If `!status.hasDds` → button visible (state = 'visible')
   - If `status.hasDds` → button hidden (state = 'hidden')
   - UI: Shows "I am DDS today" button (lines 211-228)

### 4. **Member Clicks "I am DDS today"**
   - Location: `/home/sauk/projects/sentinel/kiosk/src/screens/SuccessScreen.tsx:81-97`
   - Handler: `handleAcceptDds()`
   - Call: `acceptDds(checkinResult.memberId)`
   - Sets state: `ddsButtonState = 'accepting'`

### 5. **Backend Accept DDS**
   - Location: `/home/sauk/projects/sentinel/backend/src/routes/dds.ts:54-70`
   - Endpoint: `POST /dds/accept` (PUBLIC - no auth required)
   - Request body: `{ memberId: string }`
   - Service call: `ddsService.acceptDds(memberId)`

### 6. **Service Creates DDS Assignment**
   - Location: `/home/sauk/projects/sentinel/backend/src/services/dds-service.ts:177-253`
   - Logic:
     1. Check member exists (lines 181-192)
     2. Check no DDS already exists for today (lines 195-210)
     3. Create `DdsAssignment` record:
        ```typescript
        {
          memberId,
          assignedDate: today,
          acceptedAt: new Date(),
          status: 'active'    // ← Directly set to 'active' (not 'pending')
        }
        ```
     4. Create audit log entry with action `'self_accepted'` (lines 224-232)
     5. Auto-transfer Lockup tag (lines 235-245)
     6. Transform to API response format (line 247)
     7. **Broadcast WebSocket event** (line 250)

### 7. **WebSocket Broadcast**
   - Location: `/home/sauk/projects/sentinel/backend/src/services/dds-service.ts:108-124`
   - Function: `toUpdateEvent(assignment)` transforms DB record to WebSocket payload
   - Broadcast call: `/home/sauk/projects/sentinel/backend/src/services/dds-service.ts:250`
     ```typescript
     broadcastDdsUpdate(toUpdateEvent(result));
     ```
   - Broadcast target: `getIO().to('presence').emit('dds_update', event)`
   - Event schema (from `events.ts`):
     ```typescript
     {
       assignmentId: string;
       member: {
         id: string;
         name: string;
         rank: string;
         division: string | null;
       };
       status: 'active';          // ← Key field
       assignedDate: ISO string;
       acceptedAt: ISO string;    // ← Set to current time
       assignedBy: null;          // ← null because self-accepted
     }
     ```

### 8. **Kiosk Receives Response**
   - Location: `/home/sauk/projects/sentinel/kiosk/src/lib/api.ts:208-211`
   - Response: `POST /dds/accept` returns `{ dds: DdsAssignment }`
   - UI Updates: Button state → 'success' (line 88), brief delay, then reset

### 9. **Dashboard Receives WebSocket Event**
   - Location: `/home/sauk/projects/sentinel/frontend/src/hooks/useDds.ts:96-99`
   - Event listener: `socketRef.current.on('dds_update', (event: DdsUpdateEvent) => updateDds(event))`
   - Handler: `updateDds()` at line 69-71:
     ```typescript
     const updateDds = useCallback((event: DdsUpdateEvent) => {
       setDds(event.dds);  // ← PROBLEM: expects `event.dds` but WebSocket sends `DdsUpdateEvent` with different structure
     }, []);
     ```

---

## IDENTIFIED DISCONNECT

### Problem Location: Frontend WebSocket Event Handling

**File:** `/home/sauk/projects/sentinel/frontend/src/hooks/useDds.ts:69-71`

```typescript
const updateDds = useCallback((event: DdsUpdateEvent) => {
  setDds(event.dds);  // ← Tries to access event.dds
}, []);
```

**Issue:**
1. The `DdsUpdateEvent` type from `events.ts` does NOT have a `dds` property
2. The backend broadcasts a `DdsUpdateEvent` with these properties:
   - `assignmentId`
   - `member`
   - `status`
   - `assignedDate`
   - `acceptedAt`
   - `assignedBy`

3. But the frontend hook defines `DdsUpdateEvent` locally (lines 24-26):
   ```typescript
   interface DdsUpdateEvent {
     dds: DdsAssignment | null;
   }
   ```

4. This mismatch means:
   - Backend sends: `{ assignmentId, member, status, assignedDate, acceptedAt, assignedBy }`
   - Frontend expects: `{ dds: DdsAssignment | null }`
   - Result: `event.dds` is always `undefined`

---

## Type Mismatch Details

### Backend Event Type (from `events.ts`)
```typescript
export interface DdsUpdateEvent {
  assignmentId: string;
  member: DdsMemberInfo;
  status: DdsStatus;
  assignedDate: string;
  acceptedAt: string | null;
  assignedBy: string | null;
}
```

### Frontend Event Type (from `useDds.ts`)
```typescript
interface DdsUpdateEvent {
  dds: DdsAssignment | null;
}
```

### Frontend DdsAssignment Type (from `useDds.ts`)
```typescript
export interface DdsAssignment {
  assignmentId: string;
  member: DdsMember;
  status: DdsStatus;
  assignedDate: string;
  acceptedAt: string | null;
  assignedBy: string | null;
}
```

**Observation:** The backend `DdsUpdateEvent` structure matches the frontend `DdsAssignment` shape, but the frontend hook wraps it incorrectly in a `{ dds: ... }` object.

---

## WebSocket Flow

### Server-to-Client Connection (Dashboard)
- File: `/home/sauk/projects/sentinel/frontend/src/hooks/useDds.ts:74-104`
- Connection setup:
  ```typescript
  socketRef.current = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: isDev ? {} : { token },
  });

  socketRef.current.on('connect', () => {
    setIsConnected(true);
    socketRef.current?.emit('subscribe_presence');  // ← Join 'presence' room
  });

  socketRef.current.on('dds_update', (event: DdsUpdateEvent) => {
    updateDds(event);  // ← This handler gets the wrong event shape
  });
  ```

### Server Broadcast (Backend)
- File: `/home/sauk/projects/sentinel/backend/src/websocket/broadcast.ts:44-46`
  ```typescript
  export function broadcastDdsUpdate(event: DdsUpdateEvent): void {
    getIO().to('presence').emit('dds_update', event);
  }
  ```

---

## Affected Areas

### When DDS is Accepted via Kiosk
1. ✅ Database record created successfully
2. ✅ Audit log entry created
3. ✅ WebSocket event broadcast to 'presence' room
4. ❌ Dashboard UI does NOT update because `event.dds` is undefined

### When DDS is Assigned via Dashboard (Admin)
- Same issue: WebSocket event sent, but frontend can't parse it

### When DDS is Transferred via Dashboard (Admin)
- Same issue: WebSocket event sent, but frontend can't parse it

### When DDS is Released
- Same issue: WebSocket event sent, but frontend can't parse it

---

## Workaround Currently in Place

The dashboard has a fallback:
- Location: `/home/sauk/projects/sentinel/frontend/src/components/dashboard/DdsPanel.tsx:239`
- After assign/transfer: `await refetch()`
- This calls `GET /dds/current` directly (line 54 in Dashboard)
- Manually re-fetches instead of relying on WebSocket update

This explains why the DDS panel *eventually* updates when you perform actions from the dashboard, but NOT when a member accepts via kiosk (no refetch call).

---

## Complete Request/Response Examples

### Kiosk: POST /dds/accept
```
REQUEST:
POST /dds/accept HTTP/1.1
X-Kiosk-API-Key: [key]
Content-Type: application/json

{ "memberId": "uuid-123" }

RESPONSE (200):
{
  "dds": {
    "id": "assign-uuid",
    "memberId": "uuid-123",
    "assignedDate": "2026-01-18",
    "acceptedAt": "2026-01-18T14:30:00.000Z",
    "releasedAt": null,
    "transferredTo": null,
    "assignedBy": null,
    "status": "active",
    "notes": null,
    "createdAt": "2026-01-18T14:30:00.000Z",
    "updatedAt": "2026-01-18T14:30:00.000Z",
    "member": {
      "id": "uuid-123",
      "name": "PO Smith",
      "rank": "PO",
      "division": "Operations"
    },
    "assignedByAdminName": null
  }
}
```

### WebSocket: dds_update Event
```javascript
// Emitted to 'presence' room
{
  assignmentId: "assign-uuid",
  member: {
    id: "uuid-123",
    name: "PO Smith",
    rank: "PO",
    division: "Operations"
  },
  status: "active",
  assignedDate: "2026-01-18T00:00:00.000Z",
  acceptedAt: "2026-01-18T14:30:00.000Z",
  assignedBy: null
}
```

### Dashboard: GET /dds/current
```
REQUEST:
GET /dds/current HTTP/1.1
Authorization: Bearer [token]

RESPONSE (200):
{
  "dds": {
    "assignmentId": "assign-uuid",
    "member": {
      "id": "uuid-123",
      "name": "PO Smith",
      "rank": "PO",
      "division": "Operations"
    },
    "status": "active",
    "assignedDate": "2026-01-18T00:00:00.000Z",
    "acceptedAt": "2026-01-18T14:30:00.000Z",
    "assignedBy": null
  }
}
```

---

## Summary of Current Behavior

| Action | Trigger | Backend | Database | WebSocket | Dashboard UI |
|--------|---------|---------|----------|-----------|--------------|
| Member clicks "I am DDS" at kiosk | ✅ | ✅ Creates DdsAssignment (active) | ✅ Record saved | ✅ Broadcast sent | ❌ Does NOT update (event.dds is undefined) |
| Admin assigns DDS | ✅ | ✅ Creates DdsAssignment (active) | ✅ Record saved | ✅ Broadcast sent | ⚠️ Updates via manual refetch() |
| Admin transfers DDS | ✅ | ✅ Creates new, marks old as transferred | ✅ Records saved | ✅ Broadcast sent | ⚠️ Updates via manual refetch() |
| Admin releases DDS | ✅ | ✅ Marks as released | ✅ Record updated | ✅ Broadcast sent | ❌ Does NOT update (event.dds is undefined) |
| Page refresh | N/A | N/A | N/A | N/A | ✅ Updates correctly from GET /dds/current |

---

## Root Cause Analysis

The type mismatch exists because:

1. **Frontend defined a local `DdsUpdateEvent` type** that wraps `DdsAssignment` in a `dds` property
2. **Backend's actual `DdsUpdateEvent` type** (in `shared/types` via `events.ts`) has a different shape
3. **The frontend hook imports the wrong type** or uses a local override
4. **No code imports the correct shared type** from backend events

This is a **schema synchronization issue** between backend WebSocket events and frontend event handlers.
