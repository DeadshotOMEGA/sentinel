# Sentinel API Routes

All REST API endpoints for the Sentinel attendance tracking system.

## Base URL

All routes are prefixed with `/api`

## Authentication

Most endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Some endpoints additionally require specific roles (admin, coxswain, readonly).

## Error Response Format

All errors return a consistent JSON structure:

```json
{
  "statusCode": 404,
  "code": "NOT_FOUND",
  "message": "Member not found",
  "details": "Member abc-123 not found",
  "howToFix": "Please check the member ID and try again."
}
```

## Routes

### Authentication

#### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "uuid-session-token",
  "user": {
    "id": "uuid",
    "username": "admin",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "email": "john@example.com"
  }
}
```

#### POST /api/auth/logout
Destroy current session. Requires auth.

**Response:** 204 No Content

#### GET /api/auth/me
Get current user info. Requires auth.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "admin",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "email": "john@example.com",
    "lastLogin": "2025-11-25T23:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### POST /api/auth/refresh
Refresh session expiry. Requires auth.

**Response:**
```json
{
  "success": true
}
```

### Members

#### GET /api/members
List members with optional filters. Requires auth.

**Query Parameters:**
- `divisionId` (uuid, optional) - Filter by division
- `memberType` (enum, optional) - Filter by type: full-time, reserve, event-attendee
- `status` (enum, optional) - Filter by status: active, inactive, leave
- `search` (string, optional) - Search by name or service number

**Response:**
```json
{
  "members": [
    {
      "id": "uuid",
      "serviceNumber": "12345",
      "firstName": "Jane",
      "lastName": "Smith",
      "rank": "AB",
      "divisionId": "uuid",
      "memberType": "reserve",
      "status": "active",
      "email": "jane@example.com",
      "phone": "204-555-0100",
      "badgeId": "uuid",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z",
      "division": {
        "id": "uuid",
        "name": "Operations",
        "code": "OPS",
        "description": "Operations division",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }
    }
  ]
}
```

#### GET /api/members/:id
Get single member. Requires auth.

**Response:**
```json
{
  "member": {
    "id": "uuid",
    "serviceNumber": "12345",
    "firstName": "Jane",
    "lastName": "Smith",
    "rank": "AB",
    "divisionId": "uuid",
    "memberType": "reserve",
    "status": "active",
    "email": "jane@example.com",
    "phone": "204-555-0100",
    "badgeId": "uuid",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "division": { ... }
  }
}
```

#### POST /api/members
Create new member. Requires auth + admin role.

**Request:**
```json
{
  "serviceNumber": "12345",
  "firstName": "Jane",
  "lastName": "Smith",
  "rank": "AB",
  "divisionId": "uuid",
  "memberType": "reserve",
  "email": "jane@example.com",
  "phone": "204-555-0100",
  "badgeId": "uuid"
}
```

**Response:** 201 Created with member object

#### PUT /api/members/:id
Update member. Requires auth + admin role.

**Request:** (all fields optional)
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "rank": "LS",
  "status": "leave"
}
```

**Response:** Updated member object

#### DELETE /api/members/:id
Soft delete member (sets status to inactive). Requires auth + admin role.

**Response:** 204 No Content

#### GET /api/members/:id/history
Get member's checkin history. Requires auth.

**Query Parameters:**
- `startDate` (ISO datetime, optional)
- `endDate` (ISO datetime, optional)

**Response:**
```json
{
  "checkins": [
    {
      "id": "uuid",
      "memberId": "uuid",
      "badgeId": "uuid",
      "direction": "in",
      "timestamp": "2025-11-25T08:00:00Z",
      "kioskId": "kiosk-1",
      "synced": true,
      "createdAt": "2025-11-25T08:00:00Z"
    }
  ]
}
```

### Check-ins

#### POST /api/checkins
Record badge scan (auto-detects in/out). Requires auth.

**Request:**
```json
{
  "serialNumber": "04:A1:B2:C3",
  "timestamp": "2025-11-25T08:00:00Z",
  "kioskId": "kiosk-1"
}
```

**Response:**
```json
{
  "checkin": {
    "id": "uuid",
    "memberId": "uuid",
    "badgeId": "uuid",
    "direction": "in",
    "timestamp": "2025-11-25T08:00:00Z",
    "kioskId": "kiosk-1",
    "synced": true,
    "createdAt": "2025-11-25T08:00:00Z"
  },
  "member": {
    "id": "uuid",
    "firstName": "Jane",
    "lastName": "Smith",
    "rank": "AB",
    "serviceNumber": "12345",
    "division": { ... }
  },
  "direction": "in"
}
```

#### POST /api/checkins/bulk
Sync offline queue (batch). Requires auth.

**Request:**
```json
{
  "checkins": [
    {
      "serialNumber": "04:A1:B2:C3",
      "timestamp": "2025-11-25T08:00:00Z",
      "kioskId": "kiosk-1"
    },
    {
      "serialNumber": "04:D4:E5:F6",
      "timestamp": "2025-11-25T08:01:00Z",
      "kioskId": "kiosk-1"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "results": [ ... ],
  "errors": []
}
```

#### GET /api/checkins/presence
Get current presence statistics. Requires auth.

**Response:**
```json
{
  "stats": {
    "totalMembers": 150,
    "present": 87,
    "absent": 58,
    "onLeave": 5,
    "lateArrivals": 12,
    "visitors": 3
  }
}
```

#### GET /api/checkins/presence/list
Get all members with current presence status. Requires auth.

**Response:**
```json
{
  "presenceList": [
    {
      "member": { ... },
      "status": "present",
      "lastCheckin": {
        "id": "uuid",
        "direction": "in",
        "timestamp": "2025-11-25T08:00:00Z"
      }
    }
  ]
}
```

### Visitors

#### GET /api/visitors
List visitors with optional filters. Requires auth.

**Query Parameters:**
- `visitType` (enum, optional) - meeting, contractor, recruitment, course, event, official, other
- `hostMemberId` (uuid, optional)
- `startDate` (ISO datetime, optional)
- `endDate` (ISO datetime, optional)

**Response:**
```json
{
  "visitors": [
    {
      "id": "uuid",
      "name": "John Public",
      "organization": "XYZ Corp",
      "visitType": "meeting",
      "hostMemberId": "uuid",
      "purpose": "Discuss contract",
      "checkinTime": "2025-11-25T10:00:00Z",
      "checkoutTime": "2025-11-25T11:30:00Z",
      "badgeId": "uuid",
      "createdAt": "2025-11-25T10:00:00Z"
    }
  ]
}
```

#### GET /api/visitors/active
Get currently signed-in visitors. Requires auth.

**Response:** Same as GET /api/visitors but only includes visitors with null checkoutTime

#### POST /api/visitors
Record visitor sign-in. Requires auth.

**Request:**
```json
{
  "name": "John Public",
  "organization": "XYZ Corp",
  "visitType": "meeting",
  "hostMemberId": "uuid",
  "purpose": "Discuss contract",
  "badgeId": "uuid"
}
```

**Response:** 201 Created with visitor object

#### PUT /api/visitors/:id/checkout
Sign out visitor. Requires auth.

**Response:** Updated visitor object with checkoutTime set

### Divisions

#### GET /api/divisions
List all divisions. Requires auth.

**Response:**
```json
{
  "divisions": [
    {
      "id": "uuid",
      "name": "Operations",
      "code": "OPS",
      "description": "Operations division",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/divisions
Create division. Requires auth + admin role.

**Request:**
```json
{
  "name": "Operations",
  "code": "OPS",
  "description": "Operations division"
}
```

**Response:** 201 Created with division object

#### PUT /api/divisions/:id
Update division. Requires auth + admin role.

**Request:** (all fields optional)
```json
{
  "name": "Operations Department",
  "description": "Updated description"
}
```

**Response:** Updated division object

#### DELETE /api/divisions/:id
Delete division (only if no members assigned). Requires auth + admin role.

**Response:** 204 No Content

### Badges

#### GET /api/badges
List badges with optional filters. Requires auth.

**Query Parameters:**
- `status` (enum, optional) - active, inactive, lost, damaged
- `assignmentType` (enum, optional) - member, event, unassigned

**Response:**
```json
{
  "badges": [
    {
      "id": "uuid",
      "serialNumber": "04:A1:B2:C3",
      "assignmentType": "member",
      "assignedToId": "uuid",
      "status": "active",
      "lastUsed": "2025-11-25T08:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-11-25T08:00:00Z"
    }
  ]
}
```

#### POST /api/badges
Register new badge. Requires auth + admin role.

**Request:**
```json
{
  "serialNumber": "04:A1:B2:C3",
  "status": "active"
}
```

**Response:** 201 Created with badge object

#### PUT /api/badges/:id/assign
Assign badge to member. Requires auth + admin role.

**Request:**
```json
{
  "assignedToId": "uuid",
  "assignmentType": "member"
}
```

**Response:** Updated badge object

#### PUT /api/badges/:id/unassign
Unassign badge. Requires auth + admin role.

**Response:** Updated badge object with assignmentType set to "unassigned"

#### PUT /api/badges/:id/status
Update badge status. Requires auth + admin role.

**Request:**
```json
{
  "status": "lost"
}
```

**Response:** Updated badge object

## Business Logic Notes

### Badge Scanning

1. Badge must be registered in system
2. Badge must be assigned to a member
3. Badge status must be "active"
4. Direction is auto-detected (opposite of last checkin, or "in" if no history)
5. Duplicate scans within 5 seconds are rejected
6. WebSocket events are broadcast on successful scan

### Member Validation

- Service numbers must be unique
- Division must exist when creating/updating members
- Soft delete only (sets status to "inactive")

### Division Constraints

- Division codes must be unique
- Cannot delete division with assigned members
