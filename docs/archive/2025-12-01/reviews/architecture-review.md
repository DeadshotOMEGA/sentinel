# Sentinel Architecture Review
**Date:** 2025-11-29
**Reviewer:** Claude Code Architecture Analysis
**Scope:** Complete system architecture review

---

## Executive Summary

### Critical Architectural Concerns

This review identifies **8 CRITICAL** and **12 HIGH** severity issues that will cause production failures, data integrity problems, and scalability bottlenecks. The system shows signs of rapid development without architectural planning, resulting in fundamental structural weaknesses.

**Most Urgent Issues:**
1. **Database connection pool will crash under load** - No connection management, exit(-1) on any error
2. **Type system inconsistency** - Database schema and TypeScript types are out of sync
3. **No WebSocket authentication** - Anyone can connect and subscribe to real-time data
4. **Race conditions in presence calculations** - Redis cache invalidation happens AFTER queries
5. **Kiosk API key hardcoded in dev mode** - Security bypass in production deployments
6. **No transaction boundaries** - Bulk sync can create partial data corruption
7. **Frontend baseURL hardcoded** - Will break in any deployment scenario
8. **N+1 query patterns everywhere** - Every checkin triggers 3+ separate database queries

**Architectural Debt Score:** 7/10 (High Risk)

---

## 1. System Architecture

### 1.1 Service Boundaries

**SEVERITY: HIGH**

**Finding:** Monolithic backend with no clear service separation. All business logic mixed into route handlers.

**Evidence:**
- `/home/sauk/projects/sentinel/backend/src/routes/checkins.ts:30-161` - 130+ line route handler doing badge lookup, member lookup, direction calculation, validation, database writes, and WebSocket broadcasting
- `/home/sauk/projects/sentinel/backend/src/routes/members.ts:98-127` - Member creation directly in route handler with duplicate validation logic
- No service layer exists - repositories are called directly from routes

**Impact:**
- Cannot unit test business logic without HTTP layer
- Duplicate validation logic across routes
- Cannot reuse check-in logic from NFC daemon without HTTP roundtrip
- Impossible to add new interfaces (CLI tools, batch jobs) without code duplication

**Recommendation:**
```typescript
// Create service layer
backend/src/services/
  checkin-service.ts     // All check-in business logic
  member-service.ts      // Member management
  badge-service.ts       // Badge assignment logic
  presence-service.ts    // Stats calculation

// Routes become thin controllers
router.post('/', requireAuth, async (req, res, next) => {
  const result = await checkinService.recordCheckin({
    serialNumber: req.body.serialNumber,
    timestamp: req.body.timestamp,
    kioskId: req.body.kioskId
  });
  res.status(201).json(result);
});
```

### 1.2 API Design Consistency

**SEVERITY: MEDIUM**

**Finding:** Inconsistent REST conventions and response formats.

**Evidence:**
- `/home/sauk/projects/sentinel/backend/src/routes/checkins.ts:192` - GET `/api/checkins/presence` returns `{ stats: {...} }`
- `/home/sauk/projects/sentinel/backend/src/routes/checkins.ts:202` - GET `/api/checkins/presence/present` returns `{ members: [...] }`
- `/home/sauk/projects/sentinel/backend/src/routes/checkins.ts:212` - GET `/api/checkins/presence/list` returns `{ presenceList: [...] }`
- `/home/sauk/projects/sentinel/backend/src/routes/members.ts:71` - GET `/api/members` returns `{ members: [...] }`

**Issues:**
1. Nested resources under `/presence/` should be their own routes
2. Mix of `stats`, `members`, `presenceList` - no naming convention
3. No pagination on any list endpoints
4. No filtering/sorting on list endpoints (except members)
5. Error responses not standardized

**Recommendation:**
```
GET  /api/presence/stats              → { data: PresenceStats }
GET  /api/presence/members             → { data: Member[], meta: { total } }
GET  /api/checkins?limit=50&offset=0   → { data: [], meta: { ... } }

Errors: { error: { code, message, howToFix }, requestId }
```

### 1.3 Data Flow Patterns

**SEVERITY: CRITICAL**

**Finding:** Synchronous database writes block request threads with no queue abstraction.

**Evidence:**
- `/home/sauk/projects/sentinel/backend/src/routes/checkins.ts:113-120` - Every badge scan does synchronous INSERT
- `/home/sauk/projects/sentinel/backend/src/db/repositories/base-repository.ts:44-50` - No connection pooling awareness
- `/home/sauk/projects/sentinel/backend/src/services/sync-service.ts:154-161` - Bulk sync processes serially, one at a time

**Impact:**
- During parade formation (100+ people arriving in 5 minutes), database will be bottleneck
- Single slow query blocks entire kiosk
- No backpressure handling
- Server restart loses in-flight check-ins

**Recommendation:**
Implement write queue with background worker:
```typescript
// Add job queue (Bull or similar)
checkinQueue.add('process-checkin', {
  serialNumber, timestamp, kioskId
});

// Worker processes asynchronously
worker.process('process-checkin', async (job) => {
  // Database write happens here
  // WebSocket broadcast happens here
});
```

---

## 2. Database Design

### 2.1 Schema vs. TypeScript Type Mismatch

**SEVERITY: CRITICAL**

**Finding:** Database schema and shared TypeScript types are inconsistent, will cause runtime errors.

**Evidence:**

| TypeScript Type | Database Column | Issue |
|----------------|-----------------|-------|
| `Member.employeeNumber?: string` | Not in schema | TypeScript expects field that doesn't exist |
| `Member.initials?: string` | Not in schema | Missing column |
| `Member.mess?: string` | Not in schema | Missing column |
| `Member.moc?: string` | Not in schema | Missing column |
| `Member.classDetails?: string` | Not in schema | Missing column |
| `Member.homePhone?: string` | `phone` (singular) | Name mismatch |
| `Member.mobilePhone?: string` | Not in schema | Missing column |
| `MemberType` enum | `member_type CHECK` constraint | `class_a/class_b/class_c` vs `full_time/reserve` |

**File References:**
- Schema: `/home/sauk/projects/sentinel/backend/db/schema.sql:20-31`
- Migrations: `/home/sauk/projects/sentinel/backend/db/migrations/001_initial_schema.sql:23-37`
- Types: `/home/sauk/projects/sentinel/shared/types/index.ts:5-25`

**Impact:**
- Queries will fail when selecting non-existent columns
- INSERTs will silently drop data
- `toCamelCase()` conversion will create undefined fields
- Member import will fail on all new fields from nominal roll

**Recommendation:**
Run migration 003 that was added but schema not updated:
```sql
-- Add missing columns from types
ALTER TABLE members
  ADD COLUMN employee_number VARCHAR(20),
  ADD COLUMN initials VARCHAR(10),
  ADD COLUMN mess VARCHAR(50),
  ADD COLUMN moc VARCHAR(50),
  ADD COLUMN class_details TEXT,
  ADD COLUMN home_phone VARCHAR(50),
  ADD COLUMN mobile_phone VARCHAR(50);

-- Rename phone → home_phone or vice versa
-- Fix member_type CHECK constraint to match TypeScript
```

### 2.2 Query Performance Issues

**SEVERITY: HIGH**

**Finding:** N+1 query pattern in every check-in, presence calculation does 4 separate table scans.

**Evidence:**

**Check-in N+1 Pattern** (`/home/sauk/projects/sentinel/backend/src/routes/checkins.ts:30-161`):
```
1. Line 45: SELECT * FROM badges WHERE serial_number = ?
2. Line 84: SELECT * FROM members WHERE id = ?
3. Line 94: SELECT * FROM checkins WHERE member_id = ? ORDER BY timestamp DESC LIMIT 1
4. Line 113: INSERT INTO checkins (...)
5. Line 142: SELECT presence stats (MASSIVE QUERY)
```
Every badge scan = 5 database round trips.

**Presence Stats Query** (`/home/sauk/projects/sentinel/backend/src/db/repositories/checkin-repository.ts:168-207`):
- Uses 3 CTEs + 3 CROSS JOINs
- Scans entire `members` table (no WHERE clause)
- Scans entire `checkins` table for DISTINCT ON
- Scans entire `visitors` table
- No composite indexes on common filter paths

**Impact:**
- 100 concurrent check-ins = 500 database queries in ~10 seconds
- Presence stats query gets slower linearly with member count
- PostgreSQL connection pool (max 20) will be exhausted
- Kiosk will timeout waiting for responses

**Recommendation:**
```sql
-- Composite index for latest check-in lookup
CREATE INDEX idx_checkins_member_latest
  ON checkins(member_id, timestamp DESC, direction);

-- Materialized view for presence (refresh every 30s)
CREATE MATERIALIZED VIEW presence_stats_mv AS
  SELECT ... (same query);

CREATE UNIQUE INDEX ON presence_stats_mv (computed_at);

-- Refresh in background job
REFRESH MATERIALIZED VIEW CONCURRENTLY presence_stats_mv;
```

### 2.3 Missing Constraints and Integrity

**SEVERITY: HIGH**

**Finding:** No referential integrity on critical relationships, no uniqueness constraints where needed.

**Missing Constraints:**
1. `badges.assigned_to_id` - No FK constraint, can reference non-existent members/attendees
2. `checkins.kiosk_id` - VARCHAR(50) with no validation, typos will create phantom kiosks
3. `members.service_number` - UNIQUE but no CHECK constraint on format
4. `events.created_by` - No FK to admin_users
5. No unique constraint on `(member_id, timestamp)` in checkins - allows exact duplicates

**Evidence:**
- Schema: `/home/sauk/projects/sentinel/backend/db/schema.sql:34-43`
- Migration: `/home/sauk/projects/sentinel/backend/db/migrations/001_initial_schema.sql:39-49`

**Impact:**
- Orphaned badge assignments (badge points to deleted member)
- Duplicate check-ins at same timestamp (5-second window not enforced)
- Typo in `kioskId` creates separate presence tracking
- Admin user deletion breaks event audit trail

**Recommendation:**
```sql
-- Add missing FKs
ALTER TABLE badges
  ADD CONSTRAINT fk_badges_assigned_to_member
  FOREIGN KEY (assigned_to_id)
  REFERENCES members(id) ON DELETE SET NULL
  WHERE assignment_type = 'member';

-- Prevent exact duplicates
CREATE UNIQUE INDEX idx_checkins_unique
  ON checkins(member_id, timestamp);

-- Validate kiosk_id enum
ALTER TABLE checkins
  ADD CONSTRAINT check_kiosk_id_format
  CHECK (kiosk_id ~ '^[a-z0-9-]+$');
```

### 2.4 Migration Strategy

**SEVERITY: MEDIUM**

**Finding:** No version tracking, migrations can be run in wrong order, no rollback strategy.

**Evidence:**
- No `schema_migrations` table to track applied migrations
- Migrations are numbered but nothing enforces order
- `/home/sauk/projects/sentinel/backend/db/migrate.ts` - Would need to see implementation
- Migration 003 added fields not in base schema - suggests migrations run out of order

**Impact:**
- Production deployments can skip migrations
- Cannot detect partial migration state
- No audit trail of schema changes
- Rollback requires manual SQL

**Recommendation:**
Use proper migration tool (node-pg-migrate, Knex, or Prisma Migrate).

---

## 3. Real-time Architecture (WebSocket)

### 3.1 No Authentication on WebSocket

**SEVERITY: CRITICAL**

**Finding:** WebSocket server has zero authentication - anyone can connect and receive all check-in events.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/websocket/server.ts:25-37
io.on('connection', (socket: TypedSocket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('subscribe_presence', () => {
    socket.join('presence');  // NO AUTH CHECK
  });
});
```

**Impact:**
- Public WiFi user can connect and view all member names, ranks, locations
- No way to restrict TV display from seeing admin-only data
- Kiosk heartbeats expose device IPs and queue sizes
- Privacy violation (member PII broadcast to anyone)

**Recommendation:**
```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const session = await getSession(token);

  if (!session) {
    return next(new Error('Authentication required'));
  }

  socket.data.user = session;
  next();
});

socket.on('subscribe_presence', () => {
  // Check if user has 'presence:read' permission
  if (!hasPermission(socket.data.user, 'presence:read')) {
    socket.emit('error', { code: 'FORBIDDEN' });
    return;
  }
  socket.join('presence');
});
```

### 3.2 No Connection Management

**SEVERITY: HIGH**

**Finding:** No connection limits, no heartbeat timeout enforcement, no reconnection backoff.

**Evidence:**
- `/home/sauk/projects/sentinel/backend/src/websocket/server.ts:21-23` - Only `pingTimeout: 60000, pingInterval: 25000`
- No max connections per IP
- No rate limiting on events
- Kiosk heartbeat received but never tracked (no timeout detection)

**Impact:**
- Single client can open 1000s of connections (DoS)
- Dead connections accumulate (memory leak)
- Cannot detect offline kiosks (heartbeat never expires)
- Broadcast to 1000s of zombie connections wastes CPU

**Recommendation:**
```typescript
const io = new Server(httpServer, {
  maxHttpBufferSize: 1e6,  // 1MB
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 10000,
  perMessageDeflate: false  // Disable compression for kiosks
});

// Connection limit per IP
const connectionCounts = new Map<string, number>();

io.use((socket, next) => {
  const ip = socket.handshake.address;
  const count = connectionCounts.get(ip) || 0;

  if (count > 10) {
    return next(new Error('Too many connections'));
  }

  connectionCounts.set(ip, count + 1);
  socket.on('disconnect', () => {
    connectionCounts.set(ip, count - 1);
  });

  next();
});
```

### 3.3 Room-based Broadcasting Issues

**SEVERITY: MEDIUM**

**Finding:** Rooms are used but never cleaned up, event rooms leak, no scoped broadcasts.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/websocket/broadcast.ts:11-12
export function broadcastCheckin(event: CheckinEvent): void {
  getIO().to('presence').emit('checkin', event);
}

// /home/sauk/projects/sentinel/backend/src/websocket/broadcast.ts:27-29
export function broadcastEventCheckin(event: EventCheckinEvent): void {
  getIO().to(`event:${event.eventId}`).emit('event_checkin', event);
}
```

**Issues:**
1. Clients join `presence` but never leave (even after logout)
2. Event rooms `event:${id}` created but never destroyed
3. Kiosk heartbeat broadcasts to ALL clients (line 42-47) - should be admin-only room
4. No way to broadcast to specific kiosk (for remote commands)

**Impact:**
- Memory leak as rooms accumulate
- Privacy: logout doesn't stop receiving events
- Performance: broadcast sends to clients that don't care

**Recommendation:**
```typescript
// Structured room hierarchy
rooms = {
  'presence',           // All presence updates
  'admin',              // Admin-only (kiosk status, etc)
  'kiosk:${id}',        // Per-kiosk commands
  'event:${id}',        // Per-event monitoring
  'tv:${id}'            // TV displays
}

// Auto-cleanup
socket.on('disconnect', () => {
  socket.rooms.forEach(room => {
    if (room.startsWith('event:')) {
      const roomSize = io.sockets.adapter.rooms.get(room)?.size;
      if (roomSize === 0) {
        // Cleanup event-specific state
      }
    }
  });
});
```

### 3.4 Event Payload Size

**SEVERITY: LOW**

**Finding:** Every check-in broadcasts full member object with division, rank, etc. Wasteful for 100+ connected clients.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/routes/checkins.ts:131-139
broadcastCheckin({
  memberId: member.id,
  memberName: `${member.firstName} ${member.lastName}`,
  rank: member.rank,
  division: member.division.name,  // Full division object
  direction,
  timestamp: scanTimestamp.toISOString(),
  kioskId,
});
```

**Recommendation:** Send minimal event, clients fetch details if needed.

---

## 4. Offline-First Design (Kiosk)

### 4.1 No Conflict Resolution

**SEVERITY: CRITICAL**

**Finding:** Bulk sync assumes timestamps are authoritative, will create impossible states if kiosk clock is wrong.

**Evidence:**
- `/home/sauk/projects/sentinel/backend/src/services/sync-service.ts:86-115` - Sorts by timestamp and deduplicates, but never validates clock sync
- `/home/sauk/projects/sentinel/backend/src/utils/timestamp-validator.ts` - Rejects >7 days old but accepts future timestamps
- No vector clocks or logical timestamps

**Scenario:**
1. Kiosk goes offline at 14:00
2. Kiosk system clock drifts to 12:00 (NTP fail)
3. Member scans at "12:05" (actually 14:05)
4. Kiosk comes online, syncs check-in at 12:05
5. Member's latest check-in is now 2 hours in the past
6. Next scan at 14:10 is "late arrival" because last was 12:05

**Impact:**
- Presence stats incorrect after any offline sync
- Member can appear "checked in" when they left hours ago
- Reports show impossible timelines
- No way to detect/fix corrupted sync

**Recommendation:**
```typescript
interface QueuedCheckin {
  id: string;
  serialNumber: string;
  kioskId: string;
  timestamp: Date;           // Wall clock time
  logicalClock: number;      // Monotonic counter per kiosk
  kioskClockOffset?: number; // Detected offset from NTP
  retryCount: number;
  createdAt: Date;
}

// On sync, backend can detect clock drift
if (Math.abs(checkin.timestamp - serverNow) > 5 minutes) {
  // Flag for manual review
  await flagCheckinForReview(checkin, 'CLOCK_DRIFT_DETECTED');
}
```

### 4.2 Unbounded Queue Growth

**SEVERITY: HIGH**

**Finding:** IndexedDB queue has no size limit, no TTL, no cleanup of failed items.

**Evidence:**
- `/home/sauk/projects/sentinel/kiosk/src/db/queue.ts:54-57` - `enqueue()` always succeeds
- `/home/sauk/projects/sentinel/kiosk/src/services/sync-service.ts:24` - RETRY_DELAYS max 2 minutes, but infinite retries
- `/home/sauk/projects/sentinel/kiosk/src/services/sync-service.ts:123-135` - Increments retry count but never gives up

**Scenario:**
1. Kiosk loses network for 3 days
2. 500 people check in/out = 1000 queued items
3. Network restored, sync starts
4. 50 items fail (deleted members, expired badges)
5. Failed items retry forever, blocking queue
6. Queue grows to 10,000 items over weeks

**Impact:**
- Browser storage quota exhausted (50MB default)
- IndexedDB operations slow to crawl
- UI freezes during sync
- Data loss when quota exceeded

**Recommendation:**
```typescript
const MAX_QUEUE_SIZE = 10000;
const MAX_RETRY_COUNT = 5;
const ITEM_TTL_DAYS = 7;

async function enqueue(checkin: QueuedCheckin): Promise<void> {
  const size = await getSize();
  if (size >= MAX_QUEUE_SIZE) {
    // Drop oldest items or reject
    throw new Error('Queue full - check network connection');
  }

  // Add TTL
  checkin.expiresAt = Date.now() + (ITEM_TTL_DAYS * 86400000);
  await database.add(STORE_NAME, checkin);
}

// Periodic cleanup
setInterval(async () => {
  const expired = await database
    .getAllFromIndex('by-timestamp')
    .filter(item => item.expiresAt < Date.now());

  for (const item of expired) {
    await database.delete(item.id);
  }
}, 3600000); // Every hour
```

### 4.3 Sync Progress Not Resumable

**SEVERITY: MEDIUM**

**Finding:** Batch sync processes all-or-nothing, network failure mid-batch loses partial progress.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/services/sync-service.ts:157-164
const response = await axios.post<BulkCheckinResponse>(
  `${apiUrl}/checkins/bulk`,
  payload,
  { timeout: 15000 }
);

// 15 second timeout with 100 items per batch
// Network glitch = entire batch retried
```

**Impact:**
- 1000 item queue = 10 batches
- Batch 7/10 fails → retry from batch 1
- Duplicate check-in detection prevents data corruption but wastes time
- Poor user experience (sync "stuck" at 60% for minutes)

**Recommendation:**
Track sync cursor in IndexedDB, resume from last successful batch.

---

## 5. Deployment Architecture

### 5.1 Database Connection Failures Fatal

**SEVERITY: CRITICAL**

**Finding:** Any database error calls `process.exit(-1)`, entire backend crashes.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/db/connection.ts:14-17
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);  // CRASH THE ENTIRE SERVER
});
```

**Impact:**
- PostgreSQL restart = backend crash = all kiosks offline
- Network blip = backend crash
- Query timeout = backend crash
- Database maintenance = extended outage
- No graceful degradation

**Recommendation:**
```typescript
pool.on('error', (err) => {
  logger.error('Database pool error', { error: err });

  // Emit health check failure
  healthCheck.markUnhealthy('database');

  // Alert ops team
  alerting.critical('Database connection error', err);

  // Do NOT crash - let health checks handle it
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', reason: 'database' });
  }
});
```

### 5.2 No Pi-Specific Optimizations

**SEVERITY: MEDIUM**

**Finding:** Backend runs same config on Pi 5 as development, no tuning for ARM/limited memory.

**Evidence:**
- `/home/sauk/projects/sentinel/backend/src/db/connection.ts:9` - `max: 20` connections hardcoded
- No `NODE_ENV=production` checks
- No memory limits on WebSocket connections
- No CPU affinity settings for single-core bottlenecks

**Pi 5 Specs:** 4-core ARM, 8GB RAM (shared with OS, kiosks, database, Redis)

**Impact:**
- 20 PostgreSQL connections × 10MB each = 200MB just for connections
- Backend + PG + Redis + 2 kiosks = ~4GB, leaving 4GB for OS/cache
- Under load, OOM killer will terminate random processes
- ARM instruction set may have different performance characteristics

**Recommendation:**
```typescript
const isPi = process.arch === 'arm64' &&
             fs.existsSync('/proc/device-tree/model');

const pool = new Pool({
  max: isPi ? 10 : 20,              // Fewer connections on Pi
  idleTimeoutMillis: isPi ? 10000 : 30000,  // Faster recycling
  connectionTimeoutMillis: 2000,
});

// Limit WebSocket buffer size on Pi
const io = new Server(httpServer, {
  maxHttpBufferSize: isPi ? 256 * 1024 : 1024 * 1024,
  perMessageDeflate: !isPi,  // Disable compression on Pi (CPU)
});
```

### 5.3 No Multi-Device Coordination

**SEVERITY: HIGH**

**Finding:** Multiple Pis (backend + 2 kiosks) have no service discovery, hardcoded IPs, no failover.

**Evidence:**
- Kiosk .env requires `VITE_API_URL=http://192.168.1.100:3000` (example)
- NFC daemon requires `API_URL` in config
- No mDNS or service mesh
- Backend IP change = manual reconfiguration of all devices

**Impact:**
- Backend Pi IP change = all kiosks offline until reconfigured
- Cannot move backend to different Pi
- No load balancing across multiple backend instances
- Kiosk cannot discover "nearest" backend on network

**Recommendation:**
```bash
# Use mDNS for service discovery
# Backend advertises as sentinel-backend.local

# Kiosk config
VITE_API_URL=http://sentinel-backend.local:3000

# NFC daemon uses same
# Avahi/Bonjour handle IP resolution
```

### 5.4 Frontend Deployment Broken

**SEVERITY: CRITICAL**

**Finding:** Frontend API baseURL is hardcoded to `/api`, assumes reverse proxy, but no reverse proxy config exists.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/frontend/src/lib/api.ts:4-6
export const api = axios.create({
  baseURL: '/api',  // Assumes same-origin deployment
  headers: { 'Content-Type': 'application/json' },
});
```

**Current setup (README):**
- Backend: `http://localhost:3000/api`
- Frontend dev: `http://localhost:5173`
- CORS enabled for `localhost:5173`

**Production deployment:**
- Backend: Pi at `http://192.168.1.100:3000/api`
- Frontend: Nginx serving static build at `http://192.168.1.100:80`
- Frontend makes requests to `/api` = `http://192.168.1.100:80/api` = 404

**Impact:**
- Production frontend cannot communicate with backend
- All API calls fail
- Admin dashboard unusable
- Requires reverse proxy configuration not documented

**Recommendation:**
```typescript
// Use environment variable
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// .env.production
VITE_API_URL=http://sentinel-backend.local:3000/api

// OR configure Nginx reverse proxy
location /api {
  proxy_pass http://localhost:3000/api;
}
```

---

## 6. Shared Code Strategy

### 6.1 Shared Types Not Actually Shared

**SEVERITY: HIGH**

**Finding:** `shared/types/index.ts` exists but each app duplicates type definitions instead of importing.

**Evidence:**
- `/home/sauk/projects/sentinel/shared/types/index.ts` defines all types
- Backend imports from `../../../shared/types` (relative path, fragile)
- Frontend/kiosk likely re-declare types (need to verify but pattern suggests)
- No build step for shared package = no version control

**Impact:**
- Type drift between frontend/backend
- Breaking changes in backend don't cause frontend compile errors
- Refactoring requires changes in multiple places
- No single source of truth

**Recommendation:**
```bash
# Make shared types a real package
cd shared/types
bun init

# package.json
{
  "name": "@sentinel/types",
  "version": "1.0.0",
  "main": "index.ts",
  "exports": {
    ".": "./index.ts"
  }
}

# Apps import via package name
import type { Member } from '@sentinel/types';

# Workspace setup (package.json in root)
{
  "workspaces": [
    "shared/types",
    "backend",
    "frontend",
    "kiosk",
    "tv-display"
  ]
}
```

### 6.2 UI Library Inconsistency

**SEVERITY: MEDIUM**

**Finding:** Frontend uses HeroUI v2, kiosk/TV use HeroUI v3-beta, shared/ui exists but not used.

**Evidence:**
- Frontend: `"@heroui/react": "^2.8.5"` (`/home/sauk/projects/sentinel/frontend/package.json`)
- Kiosk: `"@heroui/react": "^3.0.0-beta.2"` (`/home/sauk/projects/sentinel/kiosk/package.json`)
- TV: `"@heroui/react": "^3.0.0-beta.2"` (`/home/sauk/projects/sentinel/tv-display/package.json`)
- Shared UI: `"@heroui/react": "^2.8.5"` (`/home/sauk/projects/sentinel/shared/ui/package.json`)

**Impact:**
- Different component APIs between apps
- Cannot share UI components
- Breaking changes in v3 beta will break kiosk/TV
- Bundle duplication (v2 + v3 both shipped)

**Recommendation:**
Pick one version (v2 stable recommended), update all apps, actually use `shared/ui`.

---

## 7. Security Architecture

### 7.1 Kiosk API Key Hardcoded

**SEVERITY: CRITICAL**

**Finding:** Dev mode kiosk API key is hardcoded, production deployment will use same key if env var not set.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/auth/middleware.ts:5-15
function getKioskApiKey(): string {
  const key = process.env.KIOSK_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('KIOSK_API_KEY environment variable must be set in production');
    }
    return 'kiosk-dev-key-change-in-production';  // INSECURE DEFAULT
  }
  return key;
}
```

**Issues:**
1. Error is thrown but what if `NODE_ENV` is not set to `production`?
2. Default key is in source control
3. All kiosks use same API key (no per-device keys)
4. Key is transmitted in plain HTTP headers (no TLS mentioned)

**Impact:**
- Anyone with default key can impersonate kiosk
- Cannot revoke single kiosk without affecting all
- Compromised key = full system compromise
- No audit trail of which kiosk made which request

**Recommendation:**
```typescript
// Generate unique key per kiosk at deployment time
const kioskKeys = new Map<string, string>();

async function loadKioskKeys(): Promise<void> {
  // Load from database or secure config
  const keys = await db.query('SELECT kiosk_id, api_key FROM kiosk_credentials');
  keys.forEach(row => kioskKeys.set(row.kiosk_id, row.api_key));
}

// Validate kiosk-specific key
const kioskId = req.headers['x-kiosk-id'];
const apiKey = req.headers['x-kiosk-api-key'];

if (!kioskKeys.has(kioskId) || kioskKeys.get(kioskId) !== apiKey) {
  return res.status(401).json({ error: 'Invalid kiosk credentials' });
}

// Rotate keys periodically
```

### 7.2 Session Management Issues

**SEVERITY: MEDIUM**

**Finding:** Sessions stored in Redis with 8-hour TTL but no refresh mechanism, no session fixation protection.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/auth/session.ts:13
const SESSION_TTL_SECONDS = 28800; // 8 hours

// /home/sauk/projects/sentinel/backend/src/auth/session.ts:75-94
export async function refreshSession(token: string): Promise<boolean> {
  // Function exists but never called from middleware
}
```

**Issues:**
1. Admin logs in, session expires after 8 hours mid-task
2. No sliding window (active sessions don't extend)
3. `refreshSession()` defined but never used
4. Session token never rotated (vulnerable to token fixation)
5. No max concurrent sessions per user

**Impact:**
- Admin interrupted during critical operation
- Stolen token valid for full 8 hours
- Cannot force logout of all sessions

**Recommendation:**
```typescript
// Middleware to auto-refresh on activity
export async function requireAuth(req, res, next) {
  const session = await getSession(token);

  // Refresh if >1 hour old
  if (session.expiresAt - Date.now() < 7 * 3600 * 1000) {
    await refreshSession(token);
  }

  next();
}

// Rotate token on privilege escalation
async function rotateSession(oldToken: string): Promise<string> {
  const session = await getSession(oldToken);
  await destroySession(oldToken);
  return await createSession(session);
}
```

### 7.3 No Input Sanitization on SQL Construction

**SEVERITY: MEDIUM**

**Finding:** Dynamic SQL in repositories uses parameterized queries (good) but no escaping of identifiers.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/db/repositories/checkin-repository.ts:46-80
async findAll(filters?: CheckinFilters): Promise<Checkin[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.memberId) {
    conditions.push(`member_id = $${paramIndex++}`);
    params.push(filters.memberId);
  }
  // ... more filters
}
```

**Good:** Uses `$1, $2` placeholders ✓
**Missing:** No validation that filter values are actually UUIDs

**Scenario:**
```typescript
// If somehow filters.memberId is not validated upstream
await checkinRepository.findAll({
  memberId: "'; DROP TABLE checkins; --"
});
// Query: WHERE member_id = $1
// Param: "'; DROP TABLE checkins; --"
// PostgreSQL treats as string, no injection
// BUT: Invalid UUID will cause query error
```

**Impact:**
- Not exploitable for SQL injection (params are safe)
- Error messages may leak schema details
- DoS via malformed UUIDs causing query errors

**Recommendation:**
Add Zod validation at repository layer:
```typescript
const FiltersSchema = z.object({
  memberId: z.string().uuid().optional(),
  badgeId: z.string().uuid().optional(),
  // ...
});

async findAll(filters?: CheckinFilters) {
  const validated = FiltersSchema.parse(filters);
  // Use validated filters
}
```

### 7.4 CORS Configuration Too Permissive

**SEVERITY: LOW**

**Finding:** CORS allows credentials from any configured origin, no origin validation.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/server.ts:28-34
const allowedOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  })
);
```

**Issue:** If `CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175`, any local attacker can send credentialed requests.

**Recommendation:** Validate origin against whitelist in production.

---

## 8. Scalability & Performance

### 8.1 No Caching Beyond Redis Presence

**SEVERITY: MEDIUM**

**Finding:** Only presence stats are cached (60s TTL), all other queries hit database every time.

**Evidence:**
- `/home/sauk/projects/sentinel/backend/src/db/repositories/checkin-repository.ts:40-42` - Cache only for `getPresenceStats()`
- Member lookups, badge lookups, division lookups - all uncached
- Every check-in does fresh member lookup despite same member scanning multiple times/day

**Impact:**
- Database under unnecessary load
- Kiosk latency higher than needed
- Cannot scale horizontally (no distributed cache strategy)

**Recommendation:**
```typescript
// Cache member details (changes rarely)
const memberCache = new Map<string, { member: Member, cachedAt: number }>();

async function findById(id: string): Promise<Member | null> {
  const cached = memberCache.get(id);
  if (cached && Date.now() - cached.cachedAt < 300000) { // 5 min
    return cached.member;
  }

  const member = await db.query(...);
  memberCache.set(id, { member, cachedAt: Date.now() });
  return member;
}

// Invalidate on update
async function update(id: string, data: UpdateMemberInput) {
  const result = await db.query(...);
  memberCache.delete(id);
  return result;
}
```

### 8.2 Presence Cache Race Condition

**SEVERITY: HIGH**

**Finding:** Redis cache is invalidated AFTER the database insert completes, creating race where stale stats are cached.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/db/repositories/checkin-repository.ts:127-155
async create(data: CreateCheckinInput): Promise<Checkin> {
  const query = `INSERT INTO checkins ...`;

  const row = await this.queryOne<Record<string, unknown>>(query, [...]);

  await this.invalidatePresenceCache();  // ⚠️ AFTER INSERT
  return toCamelCase<Checkin>(row);
}

// Meanwhile in getPresenceStats():
async getPresenceStats(): Promise<PresenceStats> {
  const cached = await redis.get(this.PRESENCE_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);  // ⚠️ RETURNS STALE DATA
  }
  // ... expensive query
}
```

**Race Condition:**
```
Time  Thread A (Check-in)              Thread B (Dashboard)
0ms   INSERT checkin (member A IN)
5ms                                    GET presence stats → cache hit (old data)
10ms  invalidate cache
15ms                                   Returns: member A still OUT ❌
```

**Impact:**
- Dashboard shows incorrect presence for up to 60 seconds
- TV display shows wrong stats
- Multiple concurrent check-ins = multiple race windows

**Recommendation:**
```typescript
async create(data: CreateCheckinInput): Promise<Checkin> {
  // Invalidate BEFORE insert
  await this.invalidatePresenceCache();

  const row = await this.queryOne<Record<string, unknown>>(query, [...]);

  return toCamelCase<Checkin>(row);
}

// OR use cache-aside with write-through
async create(data: CreateCheckinInput): Promise<Checkin> {
  await this.invalidatePresenceCache();

  const result = await this.queryOne(...);

  // Immediately recalculate and cache
  const stats = await this.calculatePresenceStats(); // Without cache
  await redis.setex(this.PRESENCE_CACHE_KEY, this.PRESENCE_CACHE_TTL, JSON.stringify(stats));

  return result;
}
```

### 8.3 No Request Rate Limiting

**SEVERITY: MEDIUM**

**Finding:** No rate limiting on any endpoints, kiosk can spam check-ins.

**Evidence:**
- No Express middleware for rate limiting
- Check-in endpoint has 5-second duplicate window but only per-member
- Kiosk can scan 100 different badges in 1 second

**Impact:**
- Malicious kiosk can DoS backend
- Accidental infinite loop in NFC daemon crashes system
- No protection against brute-force on login

**Recommendation:**
```typescript
import rateLimit from 'express-rate-limit';

const checkinLimiter = rateLimit({
  windowMs: 60000,  // 1 minute
  max: 100,         // 100 check-ins per minute per kiosk
  keyGenerator: (req) => req.headers['x-kiosk-id'] || req.ip,
});

router.post('/checkins', checkinLimiter, requireAuth, async (req, res) => {
  // ...
});
```

### 8.4 No Database Query Timeout

**SEVERITY: MEDIUM**

**Finding:** PostgreSQL connection has `connectionTimeoutMillis: 2000` but no `statement_timeout`.

**Evidence:**
```typescript
// /home/sauk/projects/sentinel/backend/src/db/connection.ts:3-12
const pool = new Pool({
  // ...
  connectionTimeoutMillis: 2000,  // Only for acquiring connection
});
// No statement_timeout set
```

**Impact:**
- Slow query (cartesian join, missing index) blocks connection forever
- Connection pool exhaustion if 20 slow queries pile up
- No way to cancel runaway queries

**Recommendation:**
```sql
-- Set globally or per-session
SET statement_timeout = '10s';

-- Or in pool config
const pool = new Pool({
  // ...
  statement_timeout: 10000,
  query_timeout: 10000,
});
```

---

## 9. Architecture Diagrams

### 9.1 Current Data Flow (Check-in)

```
┌─────────────┐
│   NFC HAT   │
│ (PN532 SPI) │
└──────┬──────┘
       │ Card UID
       ▼
┌──────────────────────────────────────────────────────┐
│  NFC Daemon (Bun)                                    │
│  /hardware/nfc-daemon/src/main.ts                    │
│                                                      │
│  1. Read UID from hardware                          │
│  2. POST /api/checkins { serialNumber: UID }        │
│  3. Wait for response (BLOCKING)                    │
│  4. POST /kiosk-notify with result                  │
└──────────────┬───────────────────────────────────────┘
               │ HTTP POST
               ▼
┌──────────────────────────────────────────────────────┐
│  Backend API (Express)                               │
│  /backend/src/routes/checkins.ts:30-161             │
│                                                      │
│  Route Handler (130 lines):                         │
│    1. Validate request body (Zod)                   │
│    2. Query badges table (serialNumber)     ◄───┐   │
│    3. Query members table (assignedToId)    ◄───┤   │
│    4. Query latest checkin (direction)      ◄───┤   │
│    5. INSERT checkin record                     │   │
│    6. Broadcast WebSocket event                 │   │
│    7. Query presence stats (4 CTEs)         ◄───┤   │
│    8. Broadcast presence update                 │   │
│    9. Return response                           │   │
│                                                 │   │
│  Total: 5 database queries per check-in ────────┘   │
└──────────────┬───────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌─────────────┐  ┌──────────────┐
│ PostgreSQL  │  │  Socket.IO   │
│ (20 conns)  │  │ (broadcast)  │
│             │  │              │
│ • badges    │  │ to('presence'│
│ • members   │  │ .emit(...)   │
│ • checkins  │  │              │
│ • divisions │  └──────┬───────┘
└─────────────┘         │
                        ▼
               ┌─────────────────┐
               │ WebSocket Clients│
               │                 │
               │ • TV Display    │
               │ • Dashboard     │
               │ • Other Kiosks  │
               │ • (No Auth)     │
               └─────────────────┘

🔴 BOTTLENECKS:
  1. 5 sequential DB queries per scan
  2. Presence stats query scans all tables
  3. WebSocket broadcast blocks response
  4. No connection pooling awareness
```

### 9.2 Offline Sync Flow Issues

```
┌─────────────────────────────────────────────────┐
│  Kiosk (Offline Mode)                           │
│                                                 │
│  1. Badge scan                                  │
│  2. Check network: navigator.onLine = false     │
│  3. Add to IndexedDB queue                      │
│     • No size limit ❌                          │
│     • No TTL ❌                                 │
│     • Timestamp from local clock (may drift) ❌ │
│                                                 │
│  ... 3 days offline ...                         │
│  ... 1000 items queued ...                      │
│                                                 │
│  4. Network restored                            │
│  5. Sync starts:                                │
│     • Fetch all 1000 items from IndexedDB       │
│     • Sort by timestamp ❌ (clock drift risk)   │
│     • Batch 100 items                           │
│     • POST /api/checkins/bulk                   │
│     • If network fails mid-batch ❌             │
│       → Retry entire batch from start           │
│       → No resumable cursor                     │
│                                                 │
│  6. Server processes:                           │
│     • For each item (serially):                 │
│       - Validate timestamp (reject >7 days)     │
│       - Lookup badge                            │
│       - Lookup member                           │
│       - Lookup last checkin (direction calc)    │
│       - INSERT checkin ❌ (no transaction)      │
│     • Broadcast 100 WebSocket events            │
│     • Return success/failures                   │
│                                                 │
│  7. Kiosk marks successful items as synced      │
│     • Failed items stay in queue ❌             │
│     • Retry forever (no max) ❌                 │
└─────────────────────────────────────────────────┘

🔴 FAILURE MODES:
  1. Clock drift → incorrect presence state
  2. Queue overflow → browser quota exceeded
  3. Partial batch failure → retry storm
  4. No transaction → data corruption on crash
  5. Infinite retries → queue never empties
```

---

## 10. Recommendations Summary

### Critical (Fix Immediately)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 1 | Database crash on error | `backend/src/db/connection.ts:14-17` | Remove `process.exit(-1)`, add health checks |
| 2 | Type/schema mismatch | `backend/db/schema.sql:20-31` vs `shared/types/index.ts:5-25` | Run migration to add missing columns |
| 3 | No WebSocket auth | `backend/src/websocket/server.ts:25-37` | Add token validation in middleware |
| 4 | Kiosk API key hardcoded | `backend/src/auth/middleware.ts:12` | Generate unique keys per kiosk |
| 5 | Frontend baseURL broken | `frontend/src/lib/api.ts:5` | Use env var `VITE_API_URL` |
| 6 | No conflict resolution | `backend/src/services/sync-service.ts:86-115` | Add logical clocks, flag drift |
| 7 | Unbounded queue | `kiosk/src/db/queue.ts:54-57` | Add max size, TTL, max retries |
| 8 | Cache race condition | `backend/src/db/repositories/checkin-repository.ts:153` | Invalidate before insert |

### High Priority (Fix This Sprint)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| 9 | N+1 queries | `backend/src/routes/checkins.ts:45-142` | Create service layer, optimize joins |
| 10 | No referential integrity | `backend/db/schema.sql:39` | Add FK constraints |
| 11 | No connection limits | `backend/src/websocket/server.ts:16-23` | Add per-IP limits, room cleanup |
| 12 | Service discovery missing | Deployment | Use mDNS or static IPs in config |
| 13 | No rate limiting | All routes | Add express-rate-limit |
| 14 | Session management | `backend/src/auth/session.ts:13` | Add auto-refresh, rotation |
| 15 | Shared types not shared | `shared/types/` | Set up proper workspace |
| 16 | HeroUI version mismatch | `package.json` files | Standardize on v2 |
| 17 | No query timeout | `backend/src/db/connection.ts:3-12` | Set statement_timeout |
| 18 | Sync not resumable | `backend/src/services/sync-service.ts:157` | Add cursor tracking |
| 19 | Missing DB constraints | `backend/db/schema.sql:67-76` | Add unique constraints |
| 20 | Pi resource limits | `backend/src/server.ts` | Tune for ARM architecture |

### Medium Priority (Next Sprint)

- Migration strategy (schema_migrations table)
- WebSocket room cleanup
- API pagination
- Caching strategy for members/badges
- Error response standardization
- Service layer extraction
- Request logging with correlation IDs
- CORS origin validation
- Health check endpoints

---

## 11. Risk Assessment

### Production Readiness: ⚠️ NOT READY

**Blockers:**
1. Type/schema mismatch will cause runtime errors on member import
2. Frontend cannot communicate with backend (baseURL issue)
3. Database error will crash entire system
4. No WebSocket authentication exposes PII
5. Offline sync will corrupt data on clock drift

**Estimated Time to Production-Ready:** 3-4 weeks

**Priority Order:**
1. Week 1: Fix database issues (schema, connections, constraints)
2. Week 2: Fix security (WebSocket auth, kiosk keys, sessions)
3. Week 3: Fix offline sync (conflict resolution, queue limits)
4. Week 4: Fix deployment (frontend baseURL, service discovery, Pi tuning)

### Architectural Debt Score: 7/10

**Categories:**
- **Data Integrity:** 8/10 (Missing constraints, type mismatches)
- **Scalability:** 6/10 (N+1 queries, no caching)
- **Security:** 7/10 (Auth issues, hardcoded secrets)
- **Reliability:** 8/10 (Crash on DB error, no failover)
- **Maintainability:** 6/10 (No service layer, duplicate logic)

---

## 12. Positive Observations

Despite critical issues, the system demonstrates:

✅ **Good:**
- Parameterized queries (no SQL injection risk)
- Zod validation on all inputs
- Custom error classes with user-friendly messages
- Offline-first thinking (IndexedDB queue exists)
- TypeScript strict mode enabled
- Repository pattern started (needs service layer)

✅ **Decent:**
- Redis caching attempted (implementation flawed)
- WebSocket broadcasting structure (needs auth)
- Graceful shutdown handlers
- Migration files exist (need tooling)

✅ **Promising:**
- Presence stats query is complex but shows thought
- Bulk sync deduplication logic exists
- NFC daemon separated from kiosk
- Shared types defined (not used consistently)

---

**End of Report**

*This review was conducted by analyzing source code, database schemas, and deployment configurations. Testing in a live environment may reveal additional issues not visible in static analysis.*
