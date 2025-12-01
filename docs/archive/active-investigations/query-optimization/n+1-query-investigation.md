# Investigation: N+1 Query Patterns in Backend

## Summary
Sentinel's backend exhibits **multiple critical N+1 query patterns** that will cause performance degradation at scale. Issues span across event management, badge assignment loops, and bulk operations. The investigation identified 7 major N+1 issues with specific recommendations for SQL joins vs batch loading.

---

## Critical N+1 Issues

### 1. **Event Attendee Expiration Loop** (HIGH PRIORITY)
**Location:** `/home/sauk/projects/sentinel/backend/src/services/event-service.ts:31-39`

**Problem:**
```typescript
// Lines 27-39: For each attendee, runs an UPDATE query
if (updatedEvent.autoExpireBadges) {
  const attendees = await eventRepository.findByEventId(eventId);  // Query 1

  for (const attendee of attendees) {                            // N Queries
    if (attendee.status !== 'expired') {
      await eventRepository.updateAttendee(attendee.id, {
        status: 'expired',
        accessEnd: new Date(),
      });  // Query 2...N+1
    }
  }
}
```

**Impact:** Closing an event with 100 attendees = 101 DB queries (1 SELECT + 100 UPDATEs)

**Solution - Batch Update:**
```sql
UPDATE event_attendees
SET status = 'expired', access_end = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE event_id = $1 AND status != 'expired'
```

**Recommendation:** Create `eventRepository.expireAttendees(eventId)` method

---

### 2. **Badge Assignment in Event Attendee Update**
**Location:** `/home/sauk/projects/sentinel/backend/src/routes/events.ts:370-450`

**Problem:**
```typescript
// Lines 410-435: Badge lookup per attendee update
if (data.badgeId && data.badgeId !== attendee.badgeId) {
  const badge = await badgeRepository.findById(data.badgeId);      // Query 1

  if (badge.assignmentType !== 'unassigned') {
    throw new ConflictError(...);
  }

  if (attendee.badgeId) {
    await badgeRepository.unassign(attendee.badgeId);              // Query 2
  }

  await badgeRepository.assign(data.badgeId, id, 'event');        // Query 3
}
```

**Context:** Single attendee update has 3 badge operations. If updating 50 attendees = 150+ queries.

**Recommendation:** Batch the badge operations in a transaction within event repository method

---

### 3. **Member Lookup in Bulk Checkin Processing** (CRITICAL)
**Location:** `/home/sauk/projects/sentinel/backend/src/services/sync-service.ts:118-204`

**Problem:**
```typescript
// For each deduplicated checkin:
for (const checkinItem of deduplicatedCheckins) {
  const badge = await badgeRepository.findBySerialNumber(serialNumber);  // Query N
  const lastCheckin = await checkinRepository.findLatestByMember(memberId); // Query N+1
  const member = await memberRepository.findById(memberId);               // Query N+2
}
```

**Impact:** Syncing 50 offline checkins = 150 DB queries instead of 3

**Solution - Batch Load:**
1. Collect all member IDs from badges first
2. Load all members in one query: `findByIds(memberIds: string[])`
3. Build in-memory map for lookups

**Missing method:** `memberRepository.findByIds(ids: string[])`

---

### 4. **Import Service Member Lookups** (HIGH)
**Location:** `/home/sauk/projects/sentinel/backend/src/services/import-service.ts:293-353`

**Problem - Two N+1 patterns:**

**Pattern A:** Finding existing members
```typescript
// Line 296: Gets specific service numbers
const existingMembers = await memberRepository.findByServiceNumbers(serviceNumbers);

// Lines 298-300: Then iterates to build map (OK)
const existingByServiceNumber = new Map<string, Member>();
existingMembers.forEach((m) => {
  existingByServiceNumber.set(m.serviceNumber, m);
});

// But then:
// Line 303: Gets ALL active members (separate query)
const allActiveMembers = await memberRepository.findAll({ status: 'active' });
// Line 349: Iterates over allActiveMembers to find missing (N comparisons)
allActiveMembers.forEach((member) => {
  if (!csvServiceNumberSet.has(member.serviceNumber)) {
    toReview.push(member);
  }
});
```

**Better approach:** Get all active members once, filter in memory

**Pattern B:** Division mapping (Lines 282-287)
```typescript
const divisions = await divisionRepository.findAll();
// Then iterates for map building (OK)

// But repeated in executeImport (line 380-385)
// Gets divisions AGAIN even though preview already loaded them
const divisions = await divisionRepository.findAll();
```

---

### 5. **Badge Query Before Checkin Creation**
**Location:** `/home/sauk/projects/sentinel/backend/src/routes/checkins.ts:63-138`

**Problem:**
```typescript
// Single checkin flow has multiple sequential queries
const badge = await badgeRepository.findBySerialNumber(serialNumber);       // Q1
const member = await memberRepository.findById(memberId);                   // Q2
const lastCheckin = await checkinRepository.findLatestByMember(memberId);   // Q3
const checkin = await checkinRepository.create({...});                      // Q4
const stats = await checkinRepository.getPresenceStats();                   // Q5 (complex CTE)
```

**Alternative:** Join badge → member in single query, or load from cache if available

---

### 6. **Event Attendee Lookup Before Badge Assignment**
**Location:** `/home/sauk/projects/sentinel/backend/src/services/event-service.ts:51-111`

**Problem:**
```typescript
// assignBadgeToAttendee() has sequential lookups
const event = await eventRepository.findById(eventId);           // Q1
const attendee = await eventRepository.findAttendeeById(attendeeId);  // Q2
const badge = await badgeRepository.findById(badgeId);           // Q3
const updatedAttendee = await eventRepository.assignBadge(...);  // Q4
await badgeRepository.assign(badgeId, eventId, 'event');        // Q5
```

**Context:** When bulk assigning badges to attendees, each assignment = 5 queries

---

### 7. **Member Presence List With Lateral Join** (MODERATE)
**Location:** `/home/sauk/projects/sentinel/backend/src/db/repositories/checkin-repository.ts:272-347`

**Problem:** Uses `LEFT JOIN LATERAL` which is correct, but:
```sql
LEFT JOIN LATERAL (
  SELECT *
  FROM checkins
  WHERE member_id = m.id
  ORDER BY timestamp DESC
  LIMIT 1
) c ON true
```

**Note:** This is CORRECTLY optimized using LATERAL. No N+1 here.

---

## Database Schema Issues

### Missing Indexes for Common Lookups
These queries would benefit from indexes:

1. **Badge lookups:**
   - `badges(serial_number)` - used in checkin flow
   - `badges(assignment_type, assigned_to_id)` - used when listing

2. **Checkin lookups:**
   - `checkins(member_id, timestamp DESC)` - used in `findLatestByMember`

3. **Event attendees:**
   - `event_attendees(event_id, status)` - used in close event flow

4. **Members:**
   - `members(service_number)` - used frequently in import

---

## Detailed Recommendations

### Immediate Fixes (P0)

#### 1. Add `memberRepository.findByIds(ids: string[])` method
```typescript
async findByIds(ids: string[]): Promise<Member[]> {
  if (ids.length === 0) return [];
  const query = `
    SELECT m.*, d.id as division_id, d.name as division_name, ...
    FROM members m
    INNER JOIN divisions d ON m.division_id = d.id
    WHERE m.id = ANY($1)
    ORDER BY m.last_name, m.first_name
  `;
  const rows = await this.queryAll(query, [ids]);
  return rows.map(row => toCamelCase<Member>(row));
}
```

**Usage in sync-service.ts:**
```typescript
const memberIds = [...new Set(validCheckins.map(c => badge[c.serialNumber]?.assignedToId))];
const membersMap = new Map(
  (await memberRepository.findByIds(memberIds)).map(m => [m.id, m])
);

for (const checkinItem of deduplicatedCheckins) {
  const member = membersMap.get(memberId); // O(1) lookup
}
```

#### 2. Add `eventRepository.expireAttendees(eventId)` method
```typescript
async expireAttendees(eventId: string): Promise<number> {
  const query = `
    UPDATE event_attendees
    SET status = 'expired', access_end = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE event_id = $1 AND status != 'expired'
  `;
  const result = await this.query(query, [eventId]);
  return result.rowCount || 0;
}
```

**Usage in event-service.ts:122:**
```typescript
if (updatedEvent.autoExpireBadges) {
  expiredCount = await eventRepository.expireAttendees(eventId);
}
```

#### 3. Add `badgeRepository.findBySerialNumbers(serialNumbers)` method
```typescript
async findBySerialNumbers(serialNumbers: string[]): Promise<Badge[]> {
  if (serialNumbers.length === 0) return [];
  const query = `
    SELECT * FROM badges WHERE serial_number = ANY($1)
  `;
  const rows = await this.queryAll(query, [serialNumbers]);
  return rows.map(row => toCamelCase<Badge>(row));
}
```

**Usage in sync-service.ts:**
```typescript
// Pre-load all badges
const badgesMap = new Map(
  (await badgeRepository.findBySerialNumbers(
    deduplicatedCheckins.map(c => c.serialNumber)
  )).map(b => [b.serialNumber, b])
);

for (const checkinItem of deduplicatedCheckins) {
  const badge = badgesMap.get(serialNumber); // O(1)
}
```

### Medium-Term Fixes (P1)

#### 4. Refactor import-service to batch divisions and members
```typescript
async generatePreview(csvText: string): Promise<ImportPreview> {
  const { rows, errors } = this.parseCSV(csvText);

  // Single division query
  const divisions = await divisionRepository.findAll();
  const divisionMap = new Map<string, string>();

  // Single service number batch
  const serviceNumbers = rows.map(r => r.serviceNumber);
  const existingMembers = await memberRepository.findByServiceNumbers(serviceNumbers);
  const existingByServiceNumber = new Map<string, Member>();

  // Replace 'findAll active' with batch from existingMembers
  const allActiveMembers = await memberRepository.findAll({ status: 'active' });
  const allServiceNumbers = new Set(allActiveMembers.map(m => m.serviceNumber));

  // Now find missing entirely in memory
  const csvServiceNumberSet = new Set(serviceNumbers);
  const toReview = allActiveMembers.filter(m => !csvServiceNumberSet.has(m.serviceNumber));
}
```

#### 5. Optimize single checkin creation
Current: 5 queries per checkin
Target: 2 queries per checkin

```typescript
// Combine member + badge lookup
const query = `
  SELECT
    b.id as badge_id, b.serial_number, b.status,
    b.assignment_type, b.assigned_to_id,
    m.id as member_id, m.first_name, m.last_name,
    m.rank, m.division_id, d.id as div_id, d.name as div_name
  FROM badges b
  LEFT JOIN members m ON b.assigned_to_id = m.id
  LEFT JOIN divisions d ON m.division_id = d.id
  WHERE b.serial_number = $1
`;
const badgeWithMember = await this.queryOne(query, [serialNumber]);
```

### Low-Priority Improvements (P2)

#### 6. Add database indexes
```sql
CREATE INDEX idx_badges_serial_number ON badges(serial_number);
CREATE INDEX idx_badges_assignment ON badges(assignment_type, assigned_to_id);
CREATE INDEX idx_checkins_member_latest ON checkins(member_id, timestamp DESC);
CREATE INDEX idx_event_attendees_event_status ON event_attendees(event_id, status);
CREATE INDEX idx_members_service_number ON members(service_number);
```

#### 7. Implement caching for stable data
- Division lookups (rarely change): Cache in memory or Redis
- Badge assignments (relatively static): Cache member→badge map
- Presence stats: Already cached (60s TTL), good pattern

---

## Impact Assessment

### Current Load (Worst Case - Import 500 Members)
- CSV parsing: 1 query
- Find existing members: 1 query
- Find all divisions: 1 query
- Find all active members: 1 query
- Bulk create/update: 500 INSERT/UPDATE queries
- **Total: ~503 queries**

### With Fixes (Same Operation)
- CSV parsing: 1 query
- Find divisions: 1 query (cached after first)
- Find existing members: 1 query
- Bulk create: 1 transaction with 500 INSERTs
- Bulk update: 1 transaction with updates
- **Total: ~3 queries + 1 transaction**
- **Reduction: ~99%**

### Real-Time Checkin Flow
**Current:** 5 queries/checkin × 100 checkins = 500 queries

**With fixes:**
- Batch load all badges: 1 query
- Batch load all members: 1 query
- Create 100 checkins: 1 transaction
- Update presence stats: 1 query
- **Total: 3-4 queries**
- **Reduction: ~98%**

---

## Files Affected by Fixes

| File | Type | Change | Complexity |
|------|------|--------|------------|
| `member-repository.ts` | Add Method | `findByIds()` | Low |
| `event-repository.ts` | Add Method | `expireAttendees()` | Low |
| `badge-repository.ts` | Add Method | `findBySerialNumbers()` | Low |
| `sync-service.ts` | Refactor | Use batch methods | Medium |
| `event-service.ts` | Refactor | Use `expireAttendees()` | Low |
| `import-service.ts` | Refactor | Batch divisions/members | Medium |
| `checkins.ts` | Optimize | Single badge+member query | Medium |
| Database | Add Indexes | 5 indexes | Low |

---

## Testing Considerations

1. **Regression Testing:**
   - All existing tests should pass
   - Verify member division data still joined correctly
   - Verify badge assignment validation still works

2. **Performance Testing:**
   - Compare query counts before/after
   - Load test with 100+ simultaneous checkins
   - Import 1000+ member CSV

3. **Data Validation:**
   - Bulk operations still atomic
   - No race conditions in batch updates
   - Division/badge lookups still accurate

