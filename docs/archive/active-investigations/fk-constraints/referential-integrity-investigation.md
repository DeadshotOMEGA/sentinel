# HIGH-9: Referential Integrity Constraints Investigation

**Status**: Critical - Multiple missing FK constraints with CASCADE rules

---

## Summary

Database schema has incomplete foreign key constraints with NO DELETE CASCADE clauses. This creates orphaned record risks where members can be deleted/marked inactive but their checkins, badges, and visitor records remain.

---

## Schema Files Location

| File | Purpose | Status |
|------|---------|--------|
| `/home/sauk/projects/sentinel/backend/db/schema.sql` | Current schema definition | PRIMARY |
| `/home/sauk/projects/sentinel/backend/db/migrations/001_initial_schema.sql` | Initial schema migration | BASE |
| `/home/sauk/projects/sentinel/backend/db/migrations/002_event_attendees.sql` | Event tables (HAS CASCADE) | PARTIAL |

---

## Current FK Constraints Analysis

### Existing FKs (NO CASCADE)

**From schema.sql and migrations/001:**

```sql
-- MEMBERS FKs (soft-deleted, not hard-deleted)
members.division_id → divisions(id)          -- NO ACTION (orphaned possible)

-- BADGES FKs
badges.assigned_to_id → members(id)          -- NO ACTION (orphaned if member deleted)

-- CHECKINS FKs (CRITICAL)
checkins.member_id → members(id)             -- NO ACTION (orphaned if member deleted)
checkins.badge_id → badges(id)               -- NO ACTION (orphaned if badge deleted)

-- VISITORS FKs (CRITICAL)
visitors.event_id → events(id)               -- NO ACTION (orphaned if event deleted)
visitors.host_member_id → members(id)        -- NO ACTION (orphaned if member deleted)
visitors.temporary_badge_id → badges(id)     -- NO ACTION (orphaned if badge deleted)

-- AUDIT_LOG FKs
audit_log.admin_user_id → admin_users(id)    -- NO ACTION (orphaned if admin deleted)
```

### Existing FKs (WITH CASCADE)

**From migrations/002 - Event Attendees (GOOD MODEL):**

```sql
event_attendees.event_id → events(id)               -- ON DELETE CASCADE ✓
event_checkins.event_attendee_id → event_attendees(id) -- ON DELETE CASCADE ✓
event_checkins.badge_id → badges(id)                   -- NO ACTION (should cascade or restrict)
```

---

## Orphaned Record Scenarios

### Scenario 1: Member Deletion/Deactivation (MOST CRITICAL)

**Current Code** (`member-repository.ts:298-311`):
```typescript
async delete(id: string): Promise<void> {
  const query = `
    UPDATE members
    SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `;
  // Soft delete only - no cascade logic
}
```

**Impact**:
- Member marked `inactive` but NOT deleted from table
- All checkins (membership.id FK) remain dangling
- Badge assignments (badges.assigned_to_id) remain dangling
- Visitor records (host_member_id) remain dangling

**Risk Level**: HIGH - Queries joining on member_id will still match inactive members

---

### Scenario 2: Badge Deletion

**Code** (`badge-repository.ts:152-169`):
```typescript
async unassign(badgeId: string): Promise<Badge> {
  const query = `
    UPDATE badges
    SET assignment_type = 'unassigned',
        assigned_to_id = NULL,
        ...
  `;
}
```

**Impact**:
- No delete method in BadgeRepository
- If badge was deleted, checkins would have orphaned badge_id FK
- Event_checkins would break (no cascade)

**Risk Level**: MEDIUM - No current deletion path visible

---

### Scenario 3: Event Deletion

**Current State**: Event table has NO explicit delete method visible

**Impact**:
- Event_attendees.event_id has ON DELETE CASCADE ✓ (GOOD)
- visitors.event_id has NO CASCADE (BAD)
- If event deleted, visitor records become orphaned

**Risk Level**: MEDIUM - Visitor records stranded without event context

---

## Missing FK Constraints (Recommended Additions)

### CRITICAL FIXES (DO IMMEDIATELY)

#### 1. **checkins.member_id** - Add Cascade or Restrict

**Current**: `UUID REFERENCES members(id)` (NO ACTION)

**Problem**: Inactive members still have FKs to them

**Recommendation**:
```sql
-- Option A: CASCADE (recommended for archival)
ALTER TABLE checkins
DROP CONSTRAINT checkins_member_id_fkey,
ADD CONSTRAINT checkins_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
```

**Rationale**: Checkins are audit/historical data. If member record removed, checkins should follow (data integrity over orphaned records).

---

#### 2. **checkins.badge_id** - Add Cascade or Restrict

**Current**: `UUID REFERENCES badges(id)` (NO ACTION)

**Problem**: Badge status changes don't cascade to checkin records

**Recommendation**:
```sql
-- Option B: RESTRICT (prevents accident deletion)
ALTER TABLE checkins
DROP CONSTRAINT checkins_badge_id_fkey,
ADD CONSTRAINT checkins_badge_id_fkey
  FOREIGN KEY (badge_id) REFERENCES badges(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
```

**Rationale**: Checkins ARE the historical record of badge usage. Prevent badge deletion if it has active checkins (data protection). Use `RESTRICT` to catch accidental deletes.

---

#### 3. **visitors.host_member_id** - Add Cascade or Restrict

**Current**: `UUID REFERENCES members(id)` (NO ACTION)

**Problem**: Host member inactive/deleted but visitor record orphaned

**Recommendation**:
```sql
-- Option B: RESTRICT (prevent accidental host deletion)
ALTER TABLE visitors
DROP CONSTRAINT visitors_host_member_id_fkey,
ADD CONSTRAINT visitors_host_member_id_fkey
  FOREIGN KEY (host_member_id) REFERENCES members(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
```

**Rationale**: Visitor record tied to host member. If host deleted, reject operation (data integrity). Admin must manually resolve visitor records first.

---

#### 4. **visitors.temporary_badge_id** - Add Cascade or Set Null

**Current**: `UUID REFERENCES badges(id)` (NO ACTION)

**Problem**: Temp badge disabled/lost but visitor record orphaned

**Recommendation**:
```sql
-- Option C: SET NULL (graceful degradation)
ALTER TABLE visitors
DROP CONSTRAINT visitors_temporary_badge_id_fkey,
ADD CONSTRAINT visitors_temporary_badge_id_fkey
  FOREIGN KEY (temporary_badge_id) REFERENCES badges(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
```

**Rationale**: Visitor can exist without badge assignment. Badge lifecycle independent of visitor record.

---

#### 5. **visitors.event_id** - Add Cascade or Restrict

**Current**: `UUID REFERENCES events(id)` (NO ACTION)

**Problem**: Event deleted/cancelled but visitor records orphaned

**Recommendation**:
```sql
-- Option A: CASCADE (event-specific visitors should cascade)
ALTER TABLE visitors
DROP CONSTRAINT visitors_event_id_fkey,
ADD CONSTRAINT visitors_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
```

**Rationale**: Visitor record is tied to specific event. Event deletion should cascade. Make this explicit as in event_attendees table.

---

#### 6. **badges.assigned_to_id** - Make FK Explicit + Cascade/Restrict

**Current**: `UUID` column (NOT EVEN A FK!)

**Problem**: Can assign badge to non-existent member ID, no constraint enforcement

**Recommendation**:
```sql
-- Add FK constraint (DOES NOT EXIST currently!)
ALTER TABLE badges
ADD CONSTRAINT badges_assigned_to_id_fkey
  FOREIGN KEY (assigned_to_id) REFERENCES members(id)
  ON DELETE SET NULL  -- Badge becomes unassigned if member deleted
  ON UPDATE CASCADE;
```

**Rationale**: Badge assignment is optional (unassigned badges exist). Set to NULL gracefully if member removed.

---

#### 7. **audit_log.admin_user_id** - Add Cascade or Restrict

**Current**: `UUID REFERENCES admin_users(id)` (NO ACTION)

**Problem**: Admin deleted but audit log orphaned

**Recommendation**:
```sql
-- Option B: RESTRICT (prevent admin deletion if audit trail exists)
ALTER TABLE audit_log
DROP CONSTRAINT audit_log_admin_user_id_fkey,
ADD CONSTRAINT audit_log_admin_user_id_fkey
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
```

**Rationale**: Audit trail is immutable. Admin user cannot be deleted if they have audit records (compliance). Use RESTRICT.

---

#### 8. **event_checkins.badge_id** - Add Restrict (NOT CASCADE)

**Current**: `UUID NOT NULL REFERENCES badges(id)` (NO ACTION, but NOT NULL!)

**Problem**: If badge deleted, event_checkin breaks with no fallback

**Recommendation**:
```sql
-- Option B: RESTRICT (prevent badge deletion if used in event)
ALTER TABLE event_checkins
DROP CONSTRAINT event_checkins_badge_id_fkey,
ADD CONSTRAINT event_checkins_badge_id_fkey
  FOREIGN KEY (badge_id) REFERENCES badges(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
```

**Rationale**: Badge with event checkins is in use. RESTRICT prevents deletion, forces admin to handle manually.

---

#### 9. **members.division_id** - Add Restrict or Set Null

**Current**: `UUID REFERENCES divisions(id)` (NO ACTION)

**Problem**: Division deleted but members orphaned

**Recommendation**:
```sql
-- Option B: RESTRICT (prevent division deletion if members exist)
ALTER TABLE members
DROP CONSTRAINT members_division_id_fkey,
ADD CONSTRAINT members_division_id_fkey
  FOREIGN KEY (division_id) REFERENCES divisions(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
```

**Rationale**: Members must belong to division. RESTRICT prevents accident division deletion.

---

## Implementation Plan

### Phase 1: Create Migration File (006_referential_integrity.sql)

**File**: `/home/sauk/projects/sentinel/backend/db/migrations/006_referential_integrity.sql`

Must:
1. Drop existing FKs without CASCADE/RESTRICT
2. Re-add with proper ON DELETE action
3. Add missing FK for badges.assigned_to_id
4. Provide rollback procedure

**Order**: Fix CRITICAL first (checkins, visitors), then MEDIUM (audit, divisions)

---

### Phase 2: Update Deletion Logic

**Files to Update**:
- `backend/src/db/repositories/member-repository.ts`: Soft-delete only, no hard delete exists (OK)
- `backend/src/db/repositories/badge-repository.ts`: Add delete method with error handling
- `backend/src/db/repositories/event-repository.ts`: Ensure delete method exists + error handling

**Key Change**: Code must catch FK constraint violations (RESTRICT/NO ACTION) and handle gracefully:

```typescript
// Example error handling
try {
  await repository.delete(id);
} catch (error) {
  if (error.code === '23503') { // FK violation
    throw new ConflictError(
      `Cannot delete ${entity} - has related records. ` +
      `Delete related ${relatedEntity} records first.`
    );
  }
  throw error;
}
```

---

### Phase 3: Add Validation Queries

**Create helper methods** to check for orphaned records:

```sql
-- Find orphaned checkins (member_id refs non-existent member)
SELECT c.* FROM checkins c
LEFT JOIN members m ON c.member_id = m.id
WHERE c.member_id IS NOT NULL AND m.id IS NULL;

-- Find orphaned visitor records
SELECT v.* FROM visitors v
LEFT JOIN members m ON v.host_member_id = m.id
WHERE v.host_member_id IS NOT NULL AND m.id IS NULL;

-- Find orphaned event_checkins
SELECT ec.* FROM event_checkins ec
LEFT JOIN badges b ON ec.badge_id = b.id
WHERE b.id IS NULL;
```

---

## Decision Summary

| Relationship | Current | Recommended | Why |
|---|---|---|---|
| checkins → members | NO ACTION | CASCADE | Historical data, follows member lifecycle |
| checkins → badges | NO ACTION | RESTRICT | Prevent badge deletion if in use |
| visitors → members | NO ACTION | RESTRICT | Prevent member deletion with active visitors |
| visitors → badges | NO ACTION | SET NULL | Badge lifecycle independent |
| visitors → events | NO ACTION | CASCADE | Visitor tied to event, cascade on delete |
| badges → members | MISSING FK | SET NULL | Optional assignment, degrade gracefully |
| audit_log → admin_users | NO ACTION | RESTRICT | Immutable audit trail, prevent admin deletion |
| event_checkins → badges | NO ACTION | RESTRICT | Prevent badge deletion if checked in |
| members → divisions | NO ACTION | RESTRICT | Prevent division deletion if members exist |

---

## Risk Assessment

**Without Fix**:
- HIGH: Orphaned checkins (millions of records with dead FK refs)
- HIGH: Inconsistent visitor records (missing host member data)
- MEDIUM: Audit trail corruption (deleted admin users)
- MEDIUM: Dangling badge assignments

**With Recommended Fixes**:
- Prevents accidental data loss (RESTRICT enforces)
- Maintains referential integrity (no orphaned records)
- Audit trail remains immutable (compliance)
- Clear error messages to admins on deletion conflicts

---

## Files Affected

**Schema/Migrations**:
- `/home/sauk/projects/sentinel/backend/db/schema.sql` - Update for reference
- `/home/sauk/projects/sentinel/backend/db/migrations/006_referential_integrity.sql` - NEW

**Application Code**:
- `/home/sauk/projects/sentinel/backend/src/db/repositories/member-repository.ts` - Error handling
- `/home/sauk/projects/sentinel/backend/src/db/repositories/badge-repository.ts` - Add delete method + error handling
- `/home/sauk/projects/sentinel/backend/src/db/repositories/event-repository.ts` - Verify delete method + error handling
- `/home/sauk/projects/sentinel/backend/src/db/repositories/visitor-repository.ts` - Error handling

---

## Next Steps

1. Review and approve FK action strategy
2. Create migration 006 with ALTER TABLE statements
3. Update repository deletion methods with FK constraint error handling
4. Test cascades in development (verify no unexpected data loss)
5. Run validation queries to identify existing orphaned records
6. Deploy migration + code together (no data fix required until migration runs)
