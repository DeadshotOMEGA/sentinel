# Sentinel Backend Architecture Analysis

**Project**: RFID Attendance Tracking System for HMCS Chippawa
**Analysis Date**: January 18, 2026
**Backend Location**: `/home/sauk/projects/sentinel/backend`
**Language**: TypeScript (ES Modules, Bun runtime)
**Key Dependencies**: Express.js, Prisma (ORM), PostgreSQL, Redis, Socket.IO, Winston (logging)

---

## 1. OVERALL ARCHITECTURE

### 1.1 Entry Point & Server Setup

**File**: `/home/sauk/projects/sentinel/backend/src/server.ts` (239 lines)

- **Port Management**: Dynamic port configuration with conflict detection (lines 18-40)
  - Checks port availability before importing heavy modules
  - Prevents duplicate instances with helpful error messages

- **Middleware Stack Order** (lines 64-182):
  ```
  1. Helmet (security headers, CSP, HSTS)
  2. HTTPS redirect (production only)
  3. Custom security headers (cache control, anti-clickjacking)
  4. CORS (supports comma-separated origins)
  5. Compression (gzip)
  6. Body parsing (JSON/URL-encoded, 10mb limit)
  7. Cookie parsing (httpOnly auth cookies)
  8. Request logging (with correlation IDs)
  9. Error injection (dev-only testing middleware)
  10. Rate limiting (disabled in dev, configurable per endpoint)
  11. API routes
  12. Global error handler (must be last)
  ```

- **Security Headers** (lines 64-107):
  - CSP with strict directives, allows WebSocket (`ws:`, `wss:`)
  - HSTS with 1-year maxAge and preload
  - Frameguard deny, noSniff, xssFilter, referrerPolicy
  - Custom cache headers prevent API response caching

- **Graceful Shutdown** (lines 192-222):
  - Listens for SIGTERM/SIGINT signals
  - Flushes Sentry events before closing (2s timeout)
  - Force shutdown after 10s timeout
  - Deletes PID file for process management

### 1.2 Environment Validation

**File**: `/home/sauk/projects/sentinel/backend/src/config/env-validation.ts` (66 lines)

- **Zod Schema** enforces required env vars at startup:
  - Database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - Redis: `REDIS_HOST`, `REDIS_PORT`, optional `REDIS_PASSWORD`
  - Auth: `JWT_SECRET` (min 32 chars), `KIOSK_API_KEY` (min 32 chars)
  - Server: `PORT`, `NODE_ENV` (dev/prod/test), `CORS_ORIGIN`
  - Logging: `LOG_LEVEL` (error/warn/info/debug, default info)
  - Optional: `DISPLAY_API_KEY` for TV display integration

- **Production Warnings** (lines 47-60):
  - Weak password detection (< 16 chars)
  - Weak JWT secret detection (< 64 chars)
  - Missing Redis password

---

## 2. ROUTE ORGANIZATION

### 2.1 Route Mounting Pattern

**File**: `/home/sauk/projects/sentinel/backend/src/routes/index.ts` (129 lines)

**Routes Mounted**:
- `/api/live` - Kubernetes liveness probe (process running?)
- `/api/ready` - Kubernetes readiness probe (DB + Redis ready?)
- `/api/health` - Detailed health status (200/503)
- `/api/metrics` - Request/WS connection statistics
- `/api/members` - Member CRUD operations
- `/api/checkins` - Badge scans and check-in operations
- `/api/visitors` - Visitor management
- `/api/divisions` - Division/department management
- `/api/badges` - Badge assignment and status
- `/api/auth` - Login, logout, session management
- `/api/events` - Event/temporary access management
- `/api/alerts` - Alert configuration
- `/api/security-alerts` - Security event logging
- `/api/dds` - Duty Desk System integration
- `/api/lockup` - End-of-day lockup procedures
- `/api/report-settings` - Report configuration
- `/api/training-years` - Training year setup
- `/api/bmq-courses` - BMQ attendance tracking
- `/api/reports` - Report generation
- `/api/tags` - Member tags
- `/api/settings` - System settings
- `/api/lists` - Dynamic list management
- `/api/enums` - Enumeration values
- `/api/admin-users` - Admin account management
- `/api/audit-logs` - Audit trail
- `/api/dev` - Development endpoints
- `/api/dev-tools` - Admin tools (developer role only)

### 2.2 Request/Response Patterns

**Validation Pattern**: Zod schemas at route entry
```typescript
// Example from /api/checkins
const badgeScanSchema = z.object({
  serialNumber: z.string().min(1),
  timestamp: z.string().datetime().optional(),
  kioskId: z.string().optional(),
});

const validationResult = badgeScanSchema.safeParse(req.body);
if (!validationResult.success) {
  throw new ValidationError(
    'INVALID_SCAN_DATA',
    validationResult.error.message,
    'Invalid badge scan data. Please check the serial number...'
  );
}
```

**Response Format**:
- Arrays wrapped in named objects: `{ badges: [...] }`, `{ members: [...] }` (NOT raw arrays)
- Errors always return `{ error: { code, message, details?, howToFix?, requestId } }`
- Success codes: 200 (GET/POST), 201 (create), 204 (delete/logout), 304 (not modified)

**Rate Limiting** (middleware/rate-limit.ts):
- Auth endpoints: 5 attempts per 15 minutes (IP + username key)
- Kiosk badge scans: 60 per minute (kiosk ID preferred, falls back to IP)
- Bulk operations: 10 per hour
- Global API: 100 per minute (disabled in dev)

---

## 3. DATA LAYER

### 3.1 Database Technology & ORM

**Technology Stack**:
- **Database**: PostgreSQL 12+
- **ORM**: Prisma 7.0.1 with pg adapter
- **Connection**: PrismaPg adapter with pg Pool
- **Adapter**: PrismaPg for native PostgreSQL queries (faster than default)

**File**: `/home/sauk/projects/sentinel/backend/src/db/prisma.ts` (65 lines)

```typescript
// Connection pattern
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter, log: logConfig });
```

**Health Check**:
```typescript
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
```

**Logging**:
- Development: logs queries, errors, warnings
- Production: errors and warnings only
- Slow query detection enabled via Prisma stdout

### 3.2 Repository Pattern Implementation

**Location**: `/home/sauk/projects/sentinel/backend/src/db/repositories/`

**Repositories** (14 files):
- `member-repository.ts` - Member CRUD with caching
- `badge-repository.ts` - Badge assignment and lookup
- `checkin-repository.ts` - Check-in records (indexed heavily)
- `visitor-repository.ts` - Temporary visitor records
- `admin-user-repository.ts` - Admin account management
- `audit-repository.ts` - Audit trail logging
- `event-repository.ts` - Event/temporary access
- `division-repository.ts` - Department/division setup
- `tag-repository.ts` - Member tag assignments
- `member-status-repository.ts` - Member status tracking
- `member-type-repository.ts` - Member type definitions
- `visit-type-repository.ts` - Visitor type definitions
- `badge-status-repository.ts` - Badge status enums
- `list-item-repository.ts` - Dynamic list management

**Repository Pattern Example** (`member-repository.ts`):
```typescript
// Conversion functions handle Prisma null → undefined
function toMember(prismaMember: PrismaMember): Member {
  return {
    id: prismaMember.id,
    serviceNumber: prismaMember.serviceNumber,
    employeeNumber: prismaMember.employeeNumber ?? undefined, // null → undefined
    firstName: prismaMember.firstName,
    // ... other fields
  };
}

export class MemberRepository {
  async findById(id: string): Promise<MemberWithDivision | null> {
    return prisma.member.findUnique({
      where: { id },
      include: { division: true },
    });
  }

  async findAll(filters: MemberFilters): Promise<MemberWithDivision[]> {
    return prisma.member.findMany({
      where: { /* filter logic */ },
      include: { division: true },
    });
  }
}
```

### 3.3 Database Schema & Indexing

**Key Models** (`prisma/schema.prisma`):

```
AdminUser (admin accounts)
  ├─ id (UUID primary key)
  ├─ username (unique, email optional)
  ├─ passwordHash (bcrypt)
  ├─ role (admin/quartermaster/developer)
  ├─ disabled (soft delete support)
  ├─ Indexes: email, disabled, (disabledBy, disabledAt)

Member (main attendance subject)
  ├─ id, serviceNumber, rank, firstName, lastName
  ├─ divisionId (FK)
  ├─ memberType (full-time/reserve/casual)
  ├─ status (active/inactive/transferred)
  ├─ badgeId (current badge assignment)
  ├─ Indexes: divisionId, memberType, status, badgeId

Badge (RFID tags)
  ├─ id, serialNumber (unique)
  ├─ assignmentType (member/visitor/temporary)
  ├─ assignedToId (FK to Member or Visitor)
  ├─ status (active/inactive/lost)
  ├─ Indexes: serialNumber, assignedToId, status, assignmentType

Checkin (attendance records)
  ├─ id, memberId (FK), badgeId (FK)
  ├─ direction (in/out)
  ├─ timestamp (indexed, sortable)
  ├─ kioskId (which terminal)
  ├─ flagged_for_review (exception handling)
  ├─ Indexes: (badgeId), (kioskId, timestamp DESC), (timestamp DESC)
  ├─ Expression Index: Covers active checkins efficiently

Visitor (temporary attendees)
  ├─ id, badgeId (FK)
  ├─ name, email, organization
  ├─ signedInAt, signedOutAt
  ├─ createdBy (adminUserId)

AuditLog (compliance tracking)
  ├─ id, adminUserId (FK)
  ├─ action (login/logout/create/update/delete)
  ├─ entityType, entityId, details (JSON)
  ├─ ipAddress (inet type)
  ├─ Indexes: (adminUserId, createdAt DESC), (createdAt DESC), (entityType, entityId)

Event (temporary access periods)
  ├─ id, name, startDate, endDate
  ├─ EventAttendee (bridge table for temporary access)
  ├─ EventCheckin (event-specific attendance)
```

### 3.4 Query Patterns & Transactions

**Basic CRUD** (repositories handle):
```typescript
// Create with validation
const member = await memberRepository.create(input); // throws ValidationError

// Update with conflict detection
await memberRepository.update(id, { status: 'inactive' }); // throws NotFoundError

// Bulk operations (imports)
await memberRepository.bulkCreate(records); // transactional, all-or-nothing
```

**Complex Queries** (in services):
```typescript
// Check-in direction detection (LastCheckinResolver)
const lastCheckin = await checkinRepository.findLastByMemberId(memberId);
const direction = lastCheckin?.direction === 'in' ? 'out' : 'in'; // Toggle logic

// Duplicate detection (5-minute window)
const recentCheckin = await checkinRepository.findRecent(badgeId, 5 * 60 * 1000);
if (recentCheckin) throw new ConflictError('DUPLICATE_CHECKIN', '...', '...');

// Presence calculation (aggregation)
const attendance = await presenceService.calculateAttendance(startDate, endDate);
```

**Transaction Handling**:
```typescript
// Prisma transaction for data consistency
export async function importMembers(memberData: MemberInput[]) {
  return prisma.$transaction(async (tx) => {
    for (const member of memberData) {
      // All operations atomic - rollback on any error
      await tx.member.create({ data: member });
    }
  });
}
```

---

## 4. BUSINESS LOGIC & SERVICE LAYER

### 4.1 Service Organization

**Location**: `/home/sauk/projects/sentinel/backend/src/services/` (6440 lines total, 17 files)

**Core Services**:

1. **checkin-service.ts** (250+ lines)
   - `processCheckin(serialNumber, options)`: Main badge scan handler
   - Validates badge, determines direction (in/out), detects duplicates
   - Broadcasts WebSocket events, updates presence
   - Handles inactive member warnings
   - Coordinates with presenceService, securityAlertService

2. **member-service.ts** (300+ lines)
   - `findById()`, `findByServiceNumber()`, `findAll()`
   - `create()`, `update()`, `deactivate()`
   - `assignBadge()`, `unassignBadge()`
   - Role-based filtering for reserves vs. full-time staff
   - Cache invalidation on updates

3. **import-service.ts** (1000+ lines - largest service)
   - CSV parsing, validation, preview generation
   - Column header detection and mapping
   - Division auto-detection
   - Duplicate detection and conflict resolution
   - Bulk import with transaction rollback
   - Field sanitization to prevent CSV injection (HIGH-7)

4. **presence-service.ts** (250+ lines)
   - `getRecentActivity(count)`: Returns activity backfill for WebSocket
   - `calculateAttendance()`: Generates presence reports
   - Real-time presence updates (subscribe/unsubscribe)
   - Activity aggregation and metrics

5. **badge-service.ts** (250+ lines)
   - Badge creation, assignment, status updates
   - Serial number validation
   - Badge reassignment with conflict detection
   - Lost/inactive badge handling

6. **event-service.ts** (200+ lines)
   - Event creation and scheduling
   - Attendee registration
   - Event-specific check-in tracking
   - Temporary access period management

7. **security-alert-service.ts** (150+ lines)
   - Flagging unusual activity (duplicate scans, after-hours)
   - Alert escalation and notification
   - Compliance auditing

8. **sync-service.ts** (250+ lines)
   - Kiosk offline sync: bulk check-in upload from IndexedDB
   - Timestamp validation (rejects future, >7 days old)
   - Duplicate detection against existing records
   - Retry logic with exponential backoff

9. **dds-service.ts** (400+ lines)
   - Duty Desk System integration
   - Watch assignment tracking
   - Schedule conflict detection
   - Validation against naval schedule rules

10. **attendance-calculator.ts** (250+ lines)
    - Calculates actual attendance from check-ins
    - Handles multiple check-ins per person per day
    - Generates attendance reports by division, rank, status

11. **simulation-service.ts** (1000+ lines)
    - Development: generates realistic test data
    - Stress testing capabilities
    - Bulk member/visitor/event generation

### 4.2 Domain Logic Location

**Check-in Flow** (core business process):
```
Route: POST /api/checkins
  ↓
Validation: badgeScanSchema.safeParse()
  ↓
Service: checkinService.processCheckin()
  ├─ Timestamp validation (CheckinTimestampValidator)
  ├─ Badge lookup (badgeRepository.findBySerialNumber)
  ├─ Last checkin lookup (direction detection)
  ├─ Duplicate detection (5-minute window)
  ├─ Security alerts (flagging)
  ├─ Database insert (checkinRepository.create)
  ├─ Presence update (presenceService)
  └─ WebSocket broadcast (broadcastCheckin)
  ↓
Response: { checkin, member, direction, warning? }
  ↓
WebSocket Event: 'checkin' → subscribed clients
```

**Import Flow** (data integrity critical):
```
Route: POST /api/members/import (preview or execute)
  ↓
Validation: CSV structure, headers, data types
  ↓
Service: importService
  ├─ CSV parsing (PapaParse)
  ├─ Column mapping detection
  ├─ Division auto-detection
  ├─ Duplicate detection (existing service numbers)
  ├─ Validation: required fields, phone formats, dates
  ├─ Preview generation (no DB writes)
  ├─ If execute:
  │   ├─ Acquire advisory lock (prevent concurrent imports)
  │   ├─ Transaction start
  │   ├─ Bulk create new members
  │   ├─ Bulk update existing members
  │   ├─ Flag conflicts for review
  │   ├─ Transaction commit/rollback
  │   └─ Release advisory lock
  └─ Return ImportResult or ImportError[]
```

### 4.3 Error Handling & Validation

**Custom Error Hierarchy** (`utils/errors.ts`):
```typescript
AppError (base, statusCode + code + message + details + howToFix)
├─ NotFoundError (404)
├─ ValidationError (400)
├─ UnauthorizedError (401)
├─ ForbiddenError (403)
├─ ConflictError (409)
```

**Error Handler Sanitization** (lines 23-51 in error-handler.ts):
- Detects sensitive patterns (file paths, SQL errors, Redis errors)
- Sanitizes to generic "A system error occurred"
- Full details logged server-side, generic message to client
- Patterns: stack traces, `ECONNREFUSED`, PostgreSQL errors, `REDIS` refs

**Validation Pattern**:
```typescript
// Zod for input validation
const schema = z.object({ name: z.string().min(1) });
const result = schema.safeParse(data);
if (!result.success) throw new ValidationError('...', result.error.message, 'How to fix...');

// Early throws (no fallbacks per project standards)
if (!user) throw new NotFoundError('USER_NOT_FOUND', 'User does not exist', 'Please check the user ID...');
```

---

## 5. AUTHENTICATION & AUTHORIZATION

### 5.1 Auth Mechanisms

**File**: `/home/sauk/projects/sentinel/backend/src/auth/middleware.ts` (231 lines)

**Three Authentication Methods**:

1. **JWT Tokens** (admin users)
   - Created on login: `POST /api/auth/login`
   - Stored in httpOnly cookie (XSS-protected)
   - Also returned in response for dev (Bearer auth)
   - 8-hour TTL (SESSION_DURATION = 86400s)
   - Verified on every request, session renewed periodically

2. **Kiosk API Key** (unattended kiosk devices)
   - X-Kiosk-API-Key header
   - Minimum 32 characters (env validated)
   - Single shared key for all kiosk devices
   - Rate limited: 60 badge scans/minute per kiosk ID

3. **Display API Key** (read-only TV displays)
   - X-Display-API-Key header (optional)
   - Read-only access to presence/activity
   - Fallback to kiosk or admin auth if not provided

### 5.2 Session Management

**File**: `/home/sauk/projects/sentinel/backend/src/auth/session.ts`

```typescript
export async function createSession(user: AdminUser): Promise<string> {
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: '24h' } // JWT lib uses token TTL
  );
  // Store in Redis with 8-hour server-side TTL
  await redis.setex(`session:${token}`, SESSION_DURATION, JSON.stringify(session));
  return token;
}

export async function getSession(token: string): Promise<Session | null> {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    const session = await redis.get(`session:${token}`);
    return session ? JSON.parse(session) : null;
  } catch {
    return null; // Invalid or expired token
  }
}
```

**Session Features**:
- Server-side session storage in Redis
- Refresh endpoint: `POST /api/auth/refresh` (extends TTL)
- Logout: `POST /api/auth/logout` (deletes Redis key)
- Session expiry monitoring: WebSocket disconnection on expiry

### 5.3 Role-Based Access Control

**Role Hierarchy** (enforce via `requireRole()` middleware):
```
1. quartermaster (level 1) - Standard users, no Settings/Dev Tools
2. admin (level 2) - Settings access, account management
3. developer (level 3) - Full access including Dev Tools
```

**Example Usage**:
```typescript
// Admin+ only
router.post('/settings', requireAuth, requireRole('admin'), async (req, res) => {
  // ...
});

// Developer only
router.get('/dev-tools', requireAuth, requireRole('developer'), async (req, res) => {
  // ...
});
```

**Dev Mode Override**:
- `NODE_ENV !== 'production' && !REQUIRE_AUTH`: Auto-authenticate as developer
- Uses hardcoded admin UUID for FK compatibility
- Disabled if REQUIRE_AUTH=true

---

## 6. WEBSOCKET IMPLEMENTATION

### 6.1 Real-Time Event Handling

**File**: `/home/sauk/projects/sentinel/backend/src/websocket/server.ts` (334 lines)

**Server Setup**:
```typescript
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});
```

**Middleware Stack**:
1. Rate limiting (10 conn/IP/min)
2. Authentication (JWT, kiosk key, display key)
3. Event rate limiting (100 events/socket/min)

### 6.2 Authentication for WebSockets

**Auth Flow**:
```typescript
async function authenticateSocket(socket: Socket): Promise<boolean> {
  const auth = socket.handshake.auth;

  // 1. JWT token (admin users)
  if (auth.token) {
    const session = await getSession(auth.token);
    if (session) return true;
  }

  // 2. Kiosk API key
  if (auth.kioskApiKey === getKioskApiKey()) return true;

  // 3. Display API key
  if (auth.displayApiKey === getDisplayApiKey()) return true;

  socket.disconnect(true); // Reject invalid auth
  return false;
}
```

**Dev Mode**: Auto-authenticate without token validation

### 6.3 Broadcasting & Events

**Broadcast Functions** (websocket/broadcast.ts):
```typescript
// From checkin-service
broadcastCheckin(checkin, member, direction);

// From presence updates
broadcastPresenceUpdate(activity);

// From visitor checkin
broadcastVisitorSignin(visitor);

// From event checkin
broadcastEventCheckin(eventCheckin);
```

**Client Events** (websocket/events.ts):
```typescript
// Client → Server
subscribe_presence // Request activity backfill
unsubscribe_presence
subscribe_event(eventId) // Event-specific updates
unsubscribe_event(eventId)
kiosk_heartbeat(kioskId, queueSize) // Kiosk status ping

// Server → Client
checkin // New check-in
presence_update // Activity update
visitor_signin // Visitor arrival
event_checkin // Event attendee check-in
activity_backfill // History on subscribe
kiosk_status // Kiosk online/offline
session_expired // Reconnect required
```

### 6.4 Rate Limiting

**File**: `/home/sauk/projects/sentinel/backend/src/websocket/rate-limit.ts` (126 lines)

**Connection Rate Limiting**:
```typescript
// 10 connections per IP per 1 minute window
// Tracks in Redis: rl:ws-conn:{ip}
// Incremented on connect, decremented on disconnect
```

**Event Rate Limiting**:
```typescript
class SocketEventRateLimiter {
  // 100 events per socket per 1 minute window
  // In-memory counter (resets per minute)
  checkEvent(): boolean { /* ... */ }
}
```

### 6.5 Session Expiry Monitoring

**For JWT sockets**:
```typescript
if (socket.auth?.authType === 'jwt') {
  socket.sessionCheckInterval = setInterval(async () => {
    const session = await getSession(socket.sessionToken);
    if (!session) {
      socket.emit('session_expired');
      socket.disconnect(true);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}
```

**Cleanup on disconnect**:
- Clear session check interval
- Decrement connection count for rate limiting
- Cleanup log stream subscriptions

---

## 7. TESTING

### 7.1 Test Coverage

**Location**: `src/**/__tests__/*.test.ts` (vitest)

**Test Files**:
- `websocket/__tests__/rate-limit.test.ts` - Connection/event rate limiting
- `websocket/__tests__/websocket-server.test.ts` - Auth, events, subscriptions
- `utils/__tests__/request-context.test.ts` - Correlation ID propagation
- `utils/__tests__/metrics.test.ts` - Request/connection metrics
- `services/__tests__/admin-checkout.test.ts` - Bulk checkout logic
- `services/__tests__/import-service.test.ts` - CSV import (critical)

### 7.2 Testing Patterns

**Test Setup** (import-service.test.ts):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks (vitest)
const { mockMemberRepository, mockDivisionRepository } = vi.hoisted(() => ({
  mockMemberRepository: { findByServiceNumbers: vi.fn(), ... },
  mockDivisionRepository: { findAll: vi.fn() },
}));

vi.mock('@db/repositories/member-repository', () => ({ memberRepository: mockMemberRepository }));

describe('ImportService', () => {
  it('validates member data before import', async () => {
    // Test setup
    // Assertion
  });
});
```

**Critical Test Areas**:
1. **Import validation** - Data integrity during CSV uploads
2. **WebSocket rate limiting** - Prevents flooding attacks
3. **Check-in duplicate detection** - Prevents duplicate records
4. **Authorization checks** - Role-based access control
5. **Async operations** - Correlation ID context propagation

### 7.3 Running Tests

```bash
cd backend
bun test  # or: npx vitest run
```

---

## 8. CODE QUALITY

### 8.1 TypeScript Usage

**Strict TypeScript Configuration**:
- No `any` types (project mandate)
- Full type inference from Prisma
- Shared types from `@shared/types`

**Example Type Safety**:
```typescript
// From checkin-service.ts
interface CheckinResult {
  checkin: Checkin; // Typed from Prisma
  member: MemberWithDivision; // With division FK resolved
  direction: CheckinDirection; // Union: 'in' | 'out'
  warning?: CheckinWarning; // Optional
}

async function processCheckin(
  serialNumber: string,
  options: CheckinOptions
): Promise<CheckinResult> { /* ... */ }
```

### 8.2 Error Handling Consistency

**Patterns**:
1. **Input validation**: Zod schemas → ValidationError
2. **Not found**: NotFoundError (404)
3. **Conflicts**: ConflictError (409) for duplicates
4. **Unauthorized**: UnauthorizedError (401) for auth
5. **Forbidden**: ForbiddenError (403) for permission denials

**Error Handler Behavior**:
- All errors logged server-side with full context
- Client receives sanitized message + code + requestId
- Zod errors provide field-level validation details
- Unknown errors always generic ("An unexpected error occurred")

### 8.3 Dependency Management

**Key Dependencies** (package.json):
```
Runtime:
- express@4.18.2 - HTTP server
- socket.io@4.7.2 - WebSocket
- @prisma/client@7.0.1 - ORM
- postgresql driver (pg@8.16.3)
- ioredis@5.3.2 - Redis client
- jsonwebtoken@9.0.2 - JWT auth
- bcrypt@5.1.1 - Password hashing
- helmet@7.1.0 - Security headers
- express-rate-limit@8.2.1 - HTTP rate limiting
- rate-limit-redis@4.3.1 - Redis-backed rate limiting
- winston@3.11.0 - Logging
- zod@3.22.4 - Validation
- papaparse@5.5.3 - CSV parsing
- @sentry/node@10.33.0 - Error tracking (optional)

Development:
- typescript@5.3.3
- vitest@1.0.0
```

### 8.4 Code Organization

**Directory Structure**:
```
src/
├─ server.ts - Express app setup
├─ config/ - Environment validation
├─ auth/ - Authentication middleware
│  ├─ middleware.ts - requireAuth, requireRole
│  ├─ session.ts - JWT + Redis sessions
│  └─ password.ts - bcrypt hashing
├─ routes/ - API endpoints (25+ files)
│  └─ index.ts - Route mounting
├─ services/ - Business logic (17 files, 6440 lines)
│  ├─ checkin-service.ts - Badge processing
│  ├─ import-service.ts - CSV imports
│  └─ presence-service.ts - Real-time activity
├─ db/
│  ├─ prisma.ts - PrismaClient singleton
│  ├─ redis.ts - Redis connection
│  └─ repositories/ - Data access (14 files)
│     └─ member-repository.ts - Example DAO
├─ middleware/ - Express middleware
│  ├─ error-handler.ts - Global error handling
│  ├─ request-logger.ts - HTTP logging
│  ├─ audit.ts - Audit trail logging
│  ├─ rate-limit.ts - HTTP rate limiting
│  └─ error-injection.ts - Dev testing
├─ websocket/ - Socket.IO implementation
│  ├─ server.ts - WebSocket server setup
│  ├─ rate-limit.ts - Connection + event limiting
│  ├─ events.ts - Type definitions
│  ├─ broadcast.ts - Server→client events
│  └─ log-stream-handler.ts - Live log streaming
├─ utils/ - Shared utilities
│  ├─ logger.ts - Winston setup
│  ├─ errors.ts - Error classes
│  ├─ request-context.ts - AsyncLocalStorage context
│  ├─ metrics.ts - Request/connection metrics
│  ├─ password-policy.ts - Zod password schema
│  ├─ timestamp-validator.ts - Check-in timestamp validation
│  ├─ name-normalizer.ts - Member name normalization
│  ├─ csv-sanitizer.ts - CSV injection prevention
│  └─ sentry.ts - Error tracking
└─ __tests__/ - Unit tests
```

---

## 9. MIDDLEWARE STACK DEEP DIVE

### 9.1 Request Logger (request-logger.ts)

**Purpose**: HTTP request logging with correlation IDs

**Flow**:
1. Creates request context with correlation ID (from header or generated UUID)
2. Sets response headers: `x-correlation-id`, `x-request-id`
3. Wraps handler in AsyncLocalStorage context
4. Records metrics on response finish
5. Logs with correlation context

**Output**:
```
2026-01-18 14:15:22 [info]: GET /api/members 200 - 125ms
```

### 9.2 Audit Middleware (audit.ts)

**Purpose**: Compliance logging of administrative actions

**Applied To**:
- `POST /api/auth/login` - Login attempts
- `POST /api/auth/logout` - Logout events
- `POST /api/members` - Member creation
- `PUT /api/members/{id}` - Member updates
- Admin user CRUD operations

**Records**:
- Admin user ID (null for dev mode)
- Action (login, logout, create, update, delete)
- Entity type and ID
- Request body/params/query (for context)
- Client IP address

### 9.3 Rate Limiting Middleware

**HTTP Rate Limiters** (all Redis-backed):

1. **standardLimiter**: 100 req/min per IP (disabled in dev)
   - Global fallback for unmapped routes

2. **authLimiter**: 5 login attempts per 15 minutes
   - Key: `auth:{ip}:{username}`
   - Applied to `/api/auth/login`, `/api/auth/change-password`
   - Prevents brute force attacks

3. **kioskLimiter**: 60 badge scans per minute
   - Key: `kiosk:{kioskId}` or `kiosk-ip:{ip}`
   - Applied to `POST /api/checkins`
   - Prevents scanning too fast

4. **bulkLimiter**: 10 bulk operations per hour
   - Applied to `/api/members/import`, `/api/checkins/bulk`
   - Prevents resource exhaustion

### 9.4 Error Injection Middleware (dev only)

**Purpose**: Simulating errors for testing error handling

**Endpoint**: `POST /api/__error/inject`

**Body**:
```json
{ "errorType": "ECONNREFUSED", "statusCode": 500 }
```

**Usage**: Development error scenario testing

---

## 10. LOGGING & OBSERVABILITY

### 10.1 Logging Architecture

**File**: `/home/sauk/projects/sentinel/backend/src/utils/logger.ts` (244 lines)

**Winston Logger**:
```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels: { error: 0, warn: 1, info: 2, http: 3, debug: 4 },
  transports: [
    new Console({ format: consoleFormat | productionFormat }),
    new LogStreamTransport(), // For live streaming
  ],
});
```

**Module Loggers** (pre-configured):
- `apiLogger` - API routes
- `wsLogger` - WebSocket events
- `authLogger` - Authentication
- `dbLogger` - Database queries
- `serviceLogger` - Business logic
- `systemLogger` - System events

**Format** (development):
```
2026-01-18 14:15:22 [info] [db]: SELECT * FROM members [a1b2c3d4] (user:user-123)
{
  "query": "SELECT * FROM members",
  "duration": "12ms"
}
```

**Format** (production):
```json
{
  "timestamp": "2026-01-18T14:15:22.000Z",
  "level": "info",
  "message": "SELECT * FROM members",
  "correlationId": "a1b2c3d4-...",
  "userId": "user-123",
  "module": "db"
}
```

### 10.2 Structured Logging Fields

**Request Context** (AsyncLocalStorage):
- `correlationId` - Trace across services
- `requestId` - Unique per request
- `userId` - Acting user
- `path`, `method` - HTTP context

**WebSocket Context**:
- `socketId` - Socket.IO connection ID
- `userId` - Authenticated user
- `authType` - JWT / kiosk_key / display_key
- `event` - Event name

**Error Context**:
- `requestId` - For support reference
- `correlationId` - Trace correlation
- `stack` - Full stack trace (server-side only)

### 10.3 Redaction & Security

**Sensitive Fields Redacted**:
- Passwords, API keys, tokens
- Email addresses (email pattern)
- Phone numbers (10+ digits)
- SSNs, credit cards
- SQL queries containing passwords

**Redaction Function** (`utils/redaction.ts`):
```typescript
const redactedValue = redact({
  password: 'secret123',
  apiKey: 'sk-abc123',
  email: 'user@example.com'
});
// { password: '[REDACTED]', apiKey: '[REDACTED]', email: '[REDACTED]' }
```

---

## 11. STRENGTHS

### 11.1 Security
✅ Helmet.js with comprehensive CSP/HSTS/X-Frame-Options
✅ HTTPS redirect in production
✅ Rate limiting with Redis (distributed, scalable)
✅ Input validation with Zod (early error throwing)
✅ Password hashing with bcrypt (12 salt rounds implied)
✅ JWT with Redis session tracking (server-side revocation)
✅ httpOnly auth cookies (XSS protection)
✅ Error message sanitization (prevents info leakage)
✅ CSV injection prevention (field sanitization)
✅ Advisory locks for concurrent import prevention

### 11.2 Architecture
✅ Clean separation: routes → services → repositories
✅ Repository pattern for data abstraction
✅ Consistent error hierarchy (5 error types)
✅ Type safety throughout (no `any` types)
✅ Async/await everywhere (no callback hell)
✅ Single PrismaClient instance (connection pooling)
✅ Redis for sessions + rate limiting + caching

### 11.3 Reliability
✅ Graceful shutdown with signal handling
✅ Health checks (liveness, readiness)
✅ Request correlation IDs for tracing
✅ Comprehensive audit logging
✅ Duplicate detection with 5-minute window
✅ Timestamp validation (rejects future, >7 days old)
✅ Transaction support for bulk imports
✅ Metrics endpoint (Prometheus-ready)

### 11.4 Observability
✅ Structured JSON logging in production
✅ Correlation ID propagation via AsyncLocalStorage
✅ Request metrics (latency, status codes)
✅ WebSocket connection tracking
✅ Module-based loggers for context
✅ Sentry integration for error tracking
✅ Live log streaming to admin dashboard

---

## 12. WEAKNESSES & AREAS FOR IMPROVEMENT

### 12.1 Performance Issues
⚠️ **Lack of Caching Layer**: Services make DB queries on every request
  - Suggestion: Cache member lists, division lists, badge lookups in Redis
  - Example: `cache:members:{divisionId}` with 5-min TTL

⚠️ **N+1 Query Problem Potential**: Bulk operations loop without batching
  - Suggestion: Use Prisma's `createMany` for bulk creates

⚠️ **No Query Result Pagination Validation**: Routes may return large result sets
  - Suggestion: Enforce max limit=100, default limit=20 in findAll routes

### 12.2 Testing Gaps
⚠️ **Integration Tests Missing**: Only unit tests exist
  - Missing: Full request→response flow tests
  - Missing: WebSocket connection → event flow tests
  - Missing: Transaction rollback scenarios

⚠️ **Coverage Unknown**: No test coverage reports
  - Suggestion: Add `vitest --coverage` to CI/CD

⚠️ **Mock Heavy**: Tests mock repositories, harder to catch real Prisma issues
  - Suggestion: Add E2E tests with real database

### 12.3 Type Safety Issues
⚠️ **Prisma null Handling**: Converting null → undefined in repositories
  - Current: `fieldName: prismaMember.fieldName ?? undefined`
  - Issue: Adds boilerplate, error-prone
  - Suggestion: Generate types from schema with correct null handling

⚠️ **Untyped WebSocket Events**: Event payloads not fully typed
  - Issue: Easy to send wrong data to clients
  - Suggestion: Stricter Zod validation before emit

### 12.4 Code Organization
⚠️ **Service Files Large**: import-service.ts (1000+ lines), simulation-service.ts (1000+ lines)
  - Suggestion: Split into smaller focused services

⚠️ **Routes Not Grouped by Feature**: 25+ route files, no clear hierarchy
  - Current: `/routes/members.ts`, `/routes/badges.ts`, etc.
  - Suggestion: Group related routes: `/routes/members/index.ts`, `/routes/members/badges.ts`

⚠️ **No DTOs/Mappers**: Converting between Prisma and API types manually
  - Issue: Scattered conversion logic
  - Suggestion: Central DTO/mapper pattern for consistency

### 12.5 Documentation Gaps
⚠️ **No API Documentation**: Missing OpenAPI/Swagger specs
  - Suggestion: Add `@ts-rest/core` or `zod-openapi` for auto-docs

⚠️ **WebSocket Event Docs Missing**: Events defined in code only
  - Suggestion: Document in `WEBSOCKET-PROTOCOL.md`

⚠️ **Database Schema Comments Missing**: Prisma schema lacks column docs
  - Suggestion: Add `/// Column description` comments

### 12.6 Error Handling Issues
⚠️ **Generic 500 Errors**: Unknown errors all return generic message
  - Issue: Hard to debug client-side issues
  - Suggestion: Log full error context server-side with requestId reference

⚠️ **No Automatic Retries**: Failed Redis/DB calls don't retry
  - Issue: Transient failures fail immediately
  - Suggestion: Add exponential backoff for transient errors

### 12.7 Configuration Issues
⚠️ **No Secrets Management**: Secrets stored in .env, checked into git (if not careful)
  - Suggestion: Use AWS Secrets Manager / HashiCorp Vault in production

⚠️ **No Config Validation for Feature Flags**: No way to toggle features at runtime
  - Suggestion: Add Redis-backed feature flag service

### 12.8 Database Issues
⚠️ **No Connection Pooling Config**: Prisma uses default pool settings
  - Suggestion: Configure `connection_limit` for production load

⚠️ **No Query Timeout**: Long-running queries can hang
  - Suggestion: Set statement_timeout in PostgreSQL

⚠️ **Audit Logs Not Sampled**: All actions logged, can grow rapidly
  - Suggestion: Implement retention policy (e.g., 90 days)

---

## 13. RECOMMENDATIONS

### Priority 1: Critical Security
1. **Implement request signing** for kiosk API key rotation
   - Current: Single shared key, no rotation mechanism
   - Fix: HMAC-based request signing with timestamp

2. **Add rate limit bypass for trusted IPs**
   - Current: All IPs rate limited equally
   - Fix: Whitelist internal services (Docker network)

3. **Enable HTTPS certificate pinning** for kioskapp
   - Prevent MITM attacks on local network

### Priority 2: Performance
1. **Implement Redis caching layer**
   - Cache: Members (5 min), Divisions (1 hour), Badges (10 min)
   - Invalidate on update

2. **Add database query monitoring**
   - Log slow queries (>100ms)
   - Set statement_timeout = 30s

3. **Batch WebSocket broadcasts**
   - Current: Emit per checkin individually
   - Suggestion: Batch multiple checkins per 100ms

### Priority 3: Reliability
1. **Add circuit breaker pattern**
   - Fail fast if Redis down, graceful degradation
   - Current: Redis errors skip rate limiting (allow connection)

2. **Implement audit log cleanup**
   - Archive old logs (>90 days) to cold storage
   - Keep recent logs in hot DB

3. **Add connection pool monitoring**
   - Alert if pool exhaustion detected
   - Current: No visibility into pool usage

### Priority 4: Observability
1. **Export Prometheus metrics endpoint**
   - Current: `/api/metrics` returns JSON
   - Add Prometheus format export for Grafana dashboards

2. **Add distributed tracing**
   - OpenTelemetry integration
   - Trace checkin flow across services

3. **Implement log aggregation**
   - Send logs to ELK stack or CloudWatch
   - Current: Logs only in container stdout

### Priority 5: Code Quality
1. **Add E2E tests**
   - Real database + real WebSocket connections
   - Test full checkin flow with kiosk

2. **Implement API documentation**
   - OpenAPI/Swagger specs
   - Auto-generate from Zod schemas

3. **Split large services**
   - `import-service.ts` → `import-service/` directory
   - `simulation-service.ts` → `simulation-service/` directory

---

## 14. DEPLOYMENT CONSIDERATIONS

### 14.1 Environment Variables Required
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sentinel
DB_USER=sentinel_user
DB_PASSWORD=<strong_password>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<optional>

# Auth
JWT_SECRET=<64+ chars, cryptographically random>
KIOSK_API_KEY=<32+ chars, cryptographically random>
DISPLAY_API_KEY=<optional>

# Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://admin.example.com,https://display.example.com

# Logging
LOG_LEVEL=info

# Optional
SENTRY_DSN=https://...@sentry.io/project
```

### 14.2 Health Check Endpoints
```bash
# Kubernetes liveness probe
curl http://localhost:3000/api/live

# Kubernetes readiness probe (checks DB + Redis)
curl http://localhost:3000/api/ready

# Detailed health status
curl http://localhost:3000/api/health

# Metrics (Prometheus-compatible)
curl http://localhost:3000/api/metrics
```

### 14.3 Scaling Considerations
- **Stateless API**: Can run multiple instances behind load balancer
- **Session State**: Stored in Redis (shared across instances)
- **Rate Limit State**: Redis-backed (global across instances)
- **Database**: PostgreSQL connection pooling via Prisma
- **WebSocket**: Socket.IO with sticky sessions needed (or Redis adapter)

---

## 15. FILE REFERENCE INDEX

| Category | File | Lines | Purpose |
|----------|------|-------|---------|
| **Entry Point** | `src/server.ts` | 239 | Express app setup, middleware stack, graceful shutdown |
| **Configuration** | `src/config/env-validation.ts` | 66 | Zod environment variable validation |
| **Routes** | `src/routes/index.ts` | 129 | Route mounting, health checks |
| **Auth** | `src/auth/middleware.ts` | 231 | JWT, kiosk key, role-based access control |
| **Auth** | `src/auth/session.ts` | - | JWT + Redis session management |
| **Error Handler** | `src/middleware/error-handler.ts` | 128 | Global error handling, sanitization |
| **Request Logger** | `src/middleware/request-logger.ts` | 51 | HTTP logging with correlation IDs |
| **Audit Logger** | `src/middleware/audit.ts` | 30 | Compliance logging |
| **Rate Limiting** | `src/middleware/rate-limit.ts` | 103 | HTTP rate limiting (Redis-backed) |
| **Database** | `src/db/prisma.ts` | 65 | PrismaClient singleton, health check |
| **Redis** | `src/db/redis.ts` | 46 | Redis connection setup |
| **Repositories** | `src/db/repositories/` | ~5000 | Data access layer (14 files) |
| **Services** | `src/services/` | ~6440 | Business logic (17 files) |
| **Checkin Service** | `src/services/checkin-service.ts` | 250+ | Badge processing, direction detection |
| **Import Service** | `src/services/import-service.ts` | 1000+ | CSV parsing, validation, bulk import |
| **WebSocket Server** | `src/websocket/server.ts` | 334 | Socket.IO setup, auth, event handlers |
| **WebSocket Rate Limit** | `src/websocket/rate-limit.ts` | 126 | Connection + event rate limiting |
| **Logger** | `src/utils/logger.ts` | 244 | Winston setup, structured logging |
| **Errors** | `src/utils/errors.ts` | 92 | Custom error hierarchy |
| **Tests** | `src/**/__tests__/` | ~500 | Unit tests (vitest) |
| **Schema** | `prisma/schema.prisma` | ~1000 | Database schema, models, indexes |

---

## CONCLUSION

The Sentinel backend is a **well-architected, security-focused REST API** with real-time capabilities via WebSocket. The codebase demonstrates:

**Strengths**:
- Clean layered architecture (routes → services → repositories)
- Strong security posture (rate limiting, input validation, error sanitization)
- Good observability (structured logging, correlation IDs, audit trails)
- Type safety throughout (TypeScript, no `any`)
- Proper separation of concerns

**Key Opportunities**:
- Caching layer (Redis) to reduce DB load
- E2E test coverage for reliability
- API documentation (OpenAPI/Swagger)
- Larger service splitting for maintainability
- Distributed tracing for debugging

The system is production-ready with minor optimization opportunities. The code quality is high, following project standards consistently throughout.

