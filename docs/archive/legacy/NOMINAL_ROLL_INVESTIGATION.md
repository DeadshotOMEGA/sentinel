# Investigation: Nominal Roll Import Feature

## Overview
Complete architectural analysis of the Sentinel RFID attendance system to support bulk CSV import of members (Nominal Roll). This document maps all relevant files, patterns, and integration points needed to implement the feature.

---

## 1. Backend API Structure

### Route Files Organization
All API routes are mounted from a central router at `/api`:

| Route File | Purpose | HTTP Methods |
|------------|---------|--------------|
| `/backend/src/routes/members.ts` | Member CRUD operations | GET, POST, PUT, DELETE |
| `/backend/src/routes/divisions.ts` | Division management | GET, POST, PUT, DELETE |
| `/backend/src/routes/badges.ts` | Badge assignment & status | GET, POST, PUT |
| `/backend/src/routes/checkins.ts` | Attendance tracking | POST, GET |
| `/backend/src/routes/visitors.ts` | Visitor management | POST, GET |
| `/backend/src/routes/events.ts` | Event management | POST, GET, PUT |
| `/backend/src/routes/auth.ts` | Authentication | POST (login) |
| `/backend/src/routes/index.ts` | Route mounting point | N/A |

**Route entry point:** `/backend/src/routes/index.ts:21`
```typescript
router.use('/members', memberRoutes);
router.use('/divisions', divisionRoutes);
```

### Member-Related API Endpoints

#### Current Endpoints (lines 37-205 of `/backend/src/routes/members.ts`)

| Method | Path | Auth | Role | Purpose |
|--------|------|------|------|---------|
| GET | `/api/members` | Required | Any | List members with filters (divisionId, memberType, status, search) |
| GET | `/api/members/:id` | Required | Any | Get single member by ID |
| POST | `/api/members` | Required | admin | Create member (with validation) |
| PUT | `/api/members/:id` | Required | admin | Update member fields |
| DELETE | `/api/members/:id` | Required | admin | Soft delete (sets status=inactive) |
| GET | `/api/members/:id/history` | Required | Any | Get member checkin history with date range filter |

#### Division Endpoints (lines 22-108 of `/backend/src/routes/divisions.ts`)

| Method | Path | Auth | Role | Purpose |
|--------|------|------|------|---------|
| GET | `/api/divisions` | Required | Any | List all divisions |
| POST | `/api/divisions` | Required | admin | Create division |
| PUT | `/api/divisions/:id` | Required | admin | Update division |
| DELETE | `/api/divisions/:id` | Required | admin | Delete division (only if no members) |

### Route Pattern Analysis

**Validation Pattern** (used consistently across all routes):
- Uses `zod` library for schema validation
- Schemas are defined at top of route file
- `safeParse()` returns validation results
- Throws `ValidationError` with user-friendly messages

Example from `/backend/src/routes/members.ts:12-22`:
```typescript
const createMemberSchema = z.object({
  serviceNumber: z.string().min(1).max(20),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  rank: z.string().min(1).max(50),
  divisionId: z.string().uuid(),
  memberType: z.enum(['full-time', 'reserve', 'event-attendee']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  badgeId: z.string().uuid().optional(),
});
```

**Error Handling Pattern** (used everywhere):
- Custom error classes: `NotFoundError`, `ValidationError`, `ConflictError`
- All errors include: message, details, howToFix guidance
- Errors propagated to `next(err)` for middleware handling
- Response format: `{ error: { code, message, details, howToFix } }`

**Authentication Pattern**:
- `requireAuth` middleware: validates JWT token
- `requireRole('admin')` middleware: checks role before operation
- Located in `/backend/src/auth/`

**Response Pattern**:
- Simple JSON: `{ members: [...] }` or `{ member: {...} }`
- Status codes: 200 (GET), 201 (POST), 204 (DELETE), 4xx (errors)

---

## 2. Database Layer

### Connection & ORM Pattern
**No ORM used** - raw SQL with parameterized queries via pg library

**Connection:** `/backend/src/db/connection.ts`
- PostgreSQL Pool from `pg` library
- Max 20 connections, 30s idle timeout, 2s connect timeout
- Environment variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

### Repository Pattern
All database operations use Repository classes in `/backend/src/db/repositories/`

**Base Repository:** `/backend/src/db/repositories/base-repository.ts`
Provides utility methods:
- `query<T>(text, params)` - Execute and return all rows
- `queryOne<T>(text, params)` - Execute and return single row
- `queryAll<T>(text, params)` - Execute and return array
- `toCamelCase(row)` - Convert snake_case DB rows to camelCase TS
- `toSnakeCase(obj)` - Convert camelCase objects to snake_case for DB
- Transaction support: `beginTransaction()`, `commitTransaction()`, `rollbackTransaction()`

**Member Repository:** `/backend/src/db/repositories/member-repository.ts`
Key methods:
- `findAll(filters?)` - With optional divisionId, memberType, status, search filters
- `findById(id)` - Returns MemberWithDivision (includes division data)
- `findByServiceNumber(serviceNumber)` - Enforce uniqueness
- `create(data)` - Insert new member
- `update(id, data)` - Patch update fields
- `delete(id)` - Soft delete (sets status='inactive')
- `getPresenceStatus(memberId)` - Get last check-in direction
- `invalidatePresenceCache()` - Clear Redis cache on data change

**Division Repository:** `/backend/src/db/repositories/division-repository.ts`
Key methods:
- `findAll()` - List all divisions ordered by code
- `findById(id)`
- `findByCode(code)` - Enforce unique division codes
- `create(data)` - Insert division
- `update(id, data)` - Patch update
- `delete(id)` - Hard delete (with FK constraint check for assigned members)

### Database Schema

**Main Tables for Import:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `divisions` | Organizational units | id (UUID), name, code (UNIQUE), created_at |
| `members` | Full-time & reserve staff | id, service_number (UNIQUE), rank, first_name, last_name, division_id (FK), member_type, status, created_at, updated_at |
| `badges` | NFC cards | id, serial_number (UNIQUE), assignment_type, assigned_to_id, status, created_at |
| `checkins` | Attendance events | id, member_id (FK), badge_id (FK), direction, timestamp, kiosk_id, synced |
| `admin_users` | Portal users | id, username (UNIQUE), password_hash, role |

**Key Constraints:**
- `service_number` must be UNIQUE (enforced at DB and app level)
- `member_type` ENUM: 'full_time', 'reserve'
- `status` ENUM: 'active', 'inactive'
- Foreign key to `divisions` table required
- Automatic `updated_at` trigger on update

**Indexes for Import Performance:**
```sql
CREATE INDEX idx_members_service_number ON members(service_number);
CREATE INDEX idx_members_division ON members(division_id);
CREATE INDEX idx_members_status ON members(status);
```

### Database Setup Files

| File | Purpose |
|------|---------|
| `/backend/db/schema.sql` | Creates all tables, triggers, views, indexes (155 lines) |
| `/backend/db/seed/dev-data.sql` | Test data with 25 members across 4 divisions |
| `/backend/db/migrate.ts` | Migration runner script |
| `/backend/db/seed.ts` | Seed runner (checks data exists first) |

---

## 3. Frontend Member Pages & Components

### Pages (in `/frontend/src/pages/`)

| File | Route | Purpose |
|------|-------|---------|
| `Members.tsx` | `/members` | Main member list & management page |
| `Dashboard.tsx` | `/` | Overview with presence stats |
| `Settings.tsx` | `/settings` | System configuration |

### Member Page Structure (`/frontend/src/pages/Members.tsx`)

**Components used:**
- HeroUI Table for member list display
- HeroUI Input for search
- HeroUI Select for status filtering
- HeroUI Button for actions
- HeroUI Spinner for loading states
- MemberModal component for CRUD operations

**State Management:**
- React Query for server state (`useQuery` hook)
- Local state for UI (search, filters, selected member)

**API calls:**
```typescript
// GET /members with query params
const response = await api.get<{ members: MemberWithDivision[] }>(
  `/members?search=${search}&status=${statusFilter}`
);

// GET /divisions
const response = await api.get<{ divisions: Division[] }>('/divisions');
```

**Table columns displayed:**
- SERVICE # (serviceNumber)
- NAME (firstName + lastName)
- RANK
- DIVISION (division.name)
- TYPE (memberType - Full-Time/Reserve)
- STATUS (active/inactive - color-coded chip)
- ACTIONS (Edit button)

### Member Modal Component (`/frontend/src/components/MemberModal.tsx`)

**Form fields:**
- Service Number (text, required)
- Rank (text, required)
- First Name (text, required)
- Last Name (text, required)
- Division (select, required)
- Member Type (select: full-time | reserve, required)
- Email (email, optional)
- Phone (text, optional)

**Validation:**
- Form validation on field change
- Server-side validation via API
- Error display with user-friendly messages

**API Operations:**
- Create: `POST /api/members` (new member)
- Update: `PUT /api/members/{id}` (existing member)
- Error handling: Catches and displays error messages from API

### API Client (`/frontend/src/lib/api.ts`)

**Setup:**
- Axios instance with baseURL `/api`
- Request interceptor adds JWT token from auth store
- Response interceptor handles 401 errors (logout)

**Usage pattern:**
```typescript
const response = await api.get<{ members: Member[] }>('/members?search=text');
const response = await api.post('/members', formData);
const response = await api.put(`/members/${id}`, formData);
```

### Frontend Routes (`/frontend/src/App.tsx:39-46`)

```typescript
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
```

---

## 4. Shared Type System

### Core Types (`/shared/types/`)

All files export TypeScript interfaces used across frontend and backend.

#### Member Types (`/shared/types/member.ts`)

```typescript
type MemberType = 'full_time' | 'reserve';
type MemberStatus = 'active' | 'inactive';

interface Member {
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

interface MemberWithDivision extends Member {
  division: Division;
}

interface MemberPresence extends MemberWithDivision {
  currentStatus: 'present' | 'absent';
  lastCheckIn?: Date;
  lastCheckOut?: Date;
}
```

#### Division Types (`/shared/types/division.ts`)

```typescript
interface Division {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
}
```

#### Main Index (`/shared/types/index.ts`)

Exports all types from:
- `index.ts` (main member/division types with extra fields like email, phone, badgeId)
- `badge.ts`
- `checkin.ts`
- `visitor.ts`
- `event.ts`
- `api.ts`

**Note:** There are TWO member type definitions:
1. In `index.ts` (has email, phone, badgeId fields)
2. In `member.ts` (minimal fields)

The main one is in `index.ts:1-49`.

#### API Types (`/shared/types/api.ts`)

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ApiError {
  code: string;
  message: string;
  details?: string;
  howToFix?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

interface PresenceStats {
  present: number;
  absent: number;
  visitors: number;
  timestamp: Date;
}
```

---

## 5. Division Seeding & Codes

### Divisions in Dev Data (`/backend/db/seed/dev-data.sql:10-14`)

Currently seeded divisions:

| Code | Name | UUID (test data) |
|------|------|-----------------|
| OPS | Operations | 11111111-1111-1111-1111-111111111111 |
| ADMIN | Administration | 22222222-2222-2222-2222-222222222222 |
| TRAIN | Training | 33333333-3333-3333-3333-333333333333 |
| CMD | Command | 44444444-4444-4444-4444-444444444444 |

### Programmatic Seeding (as backup)

Also defined in `/backend/db/seed.ts:41-47`:
```typescript
const divisions = [
  { name: 'Operations', code: 'OPS' },
  { name: 'Administration', code: 'ADMIN' },
  { name: 'Training', code: 'TRAIN' },
  { name: 'Command', code: 'CMD' },
  { name: 'Logistics', code: 'LOG' }
];
```

### Division Uniqueness Constraints

- Division codes MUST be unique (UNIQUE constraint in DB)
- Divisions cannot be deleted if members are assigned (FK constraint check)
- Code is typically 2-10 characters, uppercase

---

## 6. Existing File Upload/Import Patterns

### Current File Handling

**In `/backend/src/server.ts:39-40`:**
```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

The backend is configured for JSON/URL-encoded bodies with 10MB limit, but:
- **No multipart/form-data middleware** (multer or similar)
- **No file upload routes** currently implemented
- **No CSV parsing libraries** in dependencies

### Available Sync Pattern (Checkins)

**Bulk Check-in Upload** endpoint exists: `/api/checkins/bulk` (referenced in CLAUDE.md:126)

Located in `/backend/src/routes/checkins.ts`, this pattern can serve as reference for bulk operations:
- Accepts array of check-in objects
- Validates timestamps (rejects >7 days old or future)
- Uses repository pattern with transaction support
- Returns success/error per item

### Error Handling for Uploads

Pattern established in `/backend/src/utils/errors.ts`:
- `ValidationError` for bad data (invalid service number, missing fields)
- `ConflictError` for duplicate service numbers
- Custom message + details + howToFix guidance
- Non-technical admin users need clear error messages

### Similar Service Pattern

File: `/backend/src/services/sync-service.ts`
Shows how to implement bulk processing:
- Batch processing of items
- Per-item error tracking
- Transaction rollback on failure
- Sync status flags

---

## 7. Authentication & Authorization

### Auth Middleware (`/backend/src/auth/`)

**Available middleware:**
- `requireAuth` - Validates JWT token exists and is valid
- `requireRole('admin')` - Checks user role before operation
- Throws `UnauthorizedError` or `ForbiddenError`

**Used on all sensitive endpoints:**
- POST /members - requires `requireRole('admin')`
- PUT /members/:id - requires `requireRole('admin')`
- DELETE /members/:id - requires `requireRole('admin')`
- POST /divisions - requires `requireRole('admin')`

### Role System

**Admin User Roles** (from `/backend/db/schema.sql:94`):
- `admin` - Full access
- `viewer` - Read-only (not enforced in current routes, but possible)

**Test Credentials** (from `/backend/db/seed/dev-data.sql:169-171`):
- Username: `admin`
- Password: `admin123`
- Password is bcrypt hashed

---

## 8. Data Flow Architecture

### Typical Request Flow

```
1. Frontend Form (Members.tsx)
   ↓
2. API Call (axios instance in /frontend/src/lib/api.ts)
   ├─ Add JWT token via interceptor
   ├─ POST/PUT to /api/members
   ↓
3. Backend Route Handler (/backend/src/routes/members.ts)
   ├─ requireAuth middleware
   ├─ requireRole('admin') middleware
   ├─ Zod schema validation
   ├─ Check for duplicate service number
   ↓
4. Repository Layer (/backend/src/db/repositories/member-repository.ts)
   ├─ Convert camelCase → snake_case
   ├─ Execute parameterized SQL query
   ├─ Return result
   ↓
5. Database (PostgreSQL)
   ├─ Execute INSERT/UPDATE
   ├─ Trigger: update updated_at timestamp
   ├─ Return affected row
   ↓
6. Response Back to Frontend
   ├─ camelCase converted result
   ├─ { member: {...} } format
   ↓
7. Frontend Update
   ├─ React Query refetch
   ├─ Modal close
   ├─ Table re-render
```

### For Bulk Import (Nominal Roll) Flow

```
1. Frontend: File upload form
   ↓
2. Parse CSV → Array of objects
   ↓
3. POST /api/members/import (NEW ENDPOINT)
   ├─ requireAuth + requireRole('admin')
   ├─ Validate CSV structure
   ├─ For each row:
   │  ├─ Validate divisions exist
   │  ├─ Check service number uniqueness
   │  ├─ Insert or update member
   │  ├─ Track errors per row
   ├─ Return: { successful: N, failed: N, errors: [...] }
   ↓
4. Response shows:
   ├─ Import summary
   ├─ List of errors with row numbers
   ├─ Success message
   ↓
5. Frontend refetch members list
```

---

## 9. Environment Configuration

### Required Environment Variables

**Backend** (`.env` or environment):
```
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=sentinel
DB_USER=sentinel
DB_PASSWORD=sentinel

REDIS_HOST=localhost
REDIS_PORT=6379
```

**Frontend** (Vite auto-discovers via VITE_ prefix):
```
VITE_API_URL=http://localhost:3001
```

---

## 10. Code Quality Patterns Used

### TypeScript Strict Mode
- No `any` types (enforced in CLAUDE.md:55)
- All return types explicit
- Proper type inference from Zod schemas

### Error Handling
- Early error throws (no silent failures)
- Custom error classes with context
- All async operations have try/catch
- Error propagation to middleware

### Validation
- Zod schemas on every input
- Database constraint enforcement
- Unique key checks before insert
- Foreign key referential integrity

### Transactions
- Base repository supports transactions
- Used in bulk operations
- Rollback on error

### Logging
- Winston logger available
- Request logger middleware
- Error context captured

### Caching
- Redis integration for presence stats
- Cache invalidation on data change
- `/backend/src/db/redis.ts` connection

---

## 11. Key Implementation Details

### Member Type Values
**Important:** Using underscore, not hyphen!
- Database: `full_time`, `reserve`
- Zod validation in routes: `z.enum(['full-time', 'reserve', 'event-attendee'])`
- Frontend display: shows "Full-Time" or "Reserve"

### Service Number Format
- Max 20 characters
- Must be UNIQUE per member
- No format validation (allows any alphanumeric)
- Example: V100001, V234567

### Status Values
- `active` - Member is available
- `inactive` - Member soft-deleted (not hard deleted)
- Default on creation: `active`
- Can be set on create or update

### Division Assignment
- Required field (divisionId UUID)
- Must reference existing division
- Cannot change division to non-existent ID (FK constraint)
- Cannot delete division with assigned members

### Badge Assignment
- Optional on member creation
- Field name: `badgeId`
- Badge must exist before assignment
- Can be NULL

---

## 12. Performance Considerations

### Database Indexes
- Service number lookup: `idx_members_service_number` (critical for import)
- Division FK: `idx_members_division`
- Status filtering: `idx_members_status`
- Checkin timestamp: `idx_checkins_member_timestamp` (critical for presence)

### Query Patterns
- Member list uses INNER JOIN to division (not LEFT JOIN)
- Active members view filters status='active'
- Queries use prepared statements (parameterized)

### Caching
- Presence stats cached in Redis
- Invalidated on any member/checkin change
- TTL: Not specified (until invalidation)

### Batch Processing
- Bulk endpoints accept arrays
- Transaction support for atomicity
- Per-item error handling
- Rollback on validation failure

---

## Summary: Files for Nominal Roll Import

### Backend Files to Modify/Create

**Create:**
- `/backend/src/routes/members/import.ts` - New import endpoint
- `/backend/src/services/import-service.ts` - CSV parsing & bulk insert logic

**Modify:**
- `/backend/src/routes/members.ts` - Mount import route
- `/backend/src/routes/index.ts` - If new route file

**Reference/Extend:**
- `/backend/src/db/repositories/member-repository.ts` - Add bulk insert method
- `/backend/src/db/repositories/division-repository.ts` - Validate divisions exist
- `/backend/src/utils/errors.ts` - May need new error type for import errors

### Frontend Files to Modify/Create

**Create:**
- `/frontend/src/components/ImportModal.tsx` - File upload UI
- `/frontend/src/hooks/useImport.ts` - Import API call hook

**Modify:**
- `/frontend/src/pages/Members.tsx` - Add import button & modal
- `/frontend/src/lib/api.ts` - Add multipart/form-data support if needed

### Database

**Query additions:**
- Bulk insert with CONFLICT handling (upsert)
- Division existence validation
- Service number duplicate detection

---

## Current Test Data

### Sample Members in Database
- 25 active members across 4 divisions
- 1 inactive member (test data)
- All have assigned badges
- Check-in history from last 2 days

### Available Test Divisions
- OPS, ADMIN, TRAIN, CMD (+ LOG in programmatic seed)

### Badges
- 25 assigned to members
- 25 temporary/unassigned
- 3 event badges
- Test data includes lost/disabled badges

