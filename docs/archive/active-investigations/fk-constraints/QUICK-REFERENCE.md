# HIGH-9 Quick Reference Card

## 3 Critical Issues

### 1. checkins → members: NO CASCADE
```
Problem: Member marked inactive, but 1M+ checkins still reference them
Fix:     ON DELETE CASCADE
File:    /home/sauk/projects/sentinel/backend/db/migrations/006_referential_integrity.sql
```

### 2. badges.assigned_to_id: MISSING FK ENTIRELY
```
Problem: Can assign badge to non-existent member (NO CONSTRAINT!)
Fix:     ADD CONSTRAINT badges_assigned_to_id_fkey FOREIGN KEY (assigned_to_id)
         REFERENCES members(id) ON DELETE SET NULL
File:    /home/sauk/projects/sentinel/backend/db/migrations/006_referential_integrity.sql
```

### 3. visitors → members: NO RESTRICT
```
Problem: Can't prevent host member deletion if visitors exist
Fix:     ON DELETE RESTRICT
File:    /home/sauk/projects/sentinel/backend/db/migrations/006_referential_integrity.sql
```

## 6 More Constraints to Fix

| Relationship | Current | Fix | Impact |
|---|---|---|---|
| checkins → badges | NO ACTION | RESTRICT | Prevent badge deletion in use |
| visitors → badges | NO ACTION | SET NULL | Graceful badge removal |
| visitors → events | NO ACTION | CASCADE | Event-tied visitors cascade |
| audit_log → admins | NO ACTION | RESTRICT | Prevent audit trail deletion |
| event_checkins → badges | NO ACTION | RESTRICT | Prevent badge deletion if checked in |
| members → divisions | NO ACTION | RESTRICT | Prevent division deletion if members exist |

## Where Everything Is

| Item | Location |
|------|----------|
| Full Analysis | `/home/sauk/projects/sentinel/docs/temp/referential-integrity-investigation.md` |
| Migration SQL | `/home/sauk/projects/sentinel/docs/temp/migration-006-template.sql` |
| Summary Table | `/home/sauk/projects/sentinel/docs/temp/fk-constraints-summary.txt` |
| Executive Brief | `/home/sauk/projects/sentinel/docs/temp/HIGH-9-EXECUTIVE-SUMMARY.md` |

## Application Code Changes Required

**Files to Update** (add FK error handling):
- `/home/sauk/projects/sentinel/backend/src/db/repositories/member-repository.ts` (line 298)
- `/home/sauk/projects/sentinel/backend/src/db/repositories/badge-repository.ts`
- `/home/sauk/projects/sentinel/backend/src/db/repositories/event-repository.ts`
- `/home/sauk/projects/sentinel/backend/src/db/repositories/visitor-repository.ts`

**Error to Catch**: PostgreSQL error code `23503` (FK violation)

**Example**:
```typescript
try {
  await memberRepository.delete(id);
} catch (error) {
  if (error.code === '23503') {
    throw new ConflictError(
      `Cannot delete member - has active visitors. Delete/reassign visitors first.`
    );
  }
  throw error;
}
```

## Current Constraint Status

### Already Correct (NO CHANGES)
- ✓ event_attendees → events (ON DELETE CASCADE)
- ✓ event_checkins → event_attendees (ON DELETE CASCADE)

### Need Fixing
- checkins → members
- checkins → badges
- visitors → members
- visitors → badges
- visitors → events
- badges → members
- audit_log → admin_users
- event_checkins → badges
- members → divisions

## Database Tables Affected

```
members (source table with soft deletes)
  ├─ checkins (attendance records) → CASCADE needed
  ├─ badges (assigned_to_id) → MISSING FK
  ├─ visitors (host_member_id) → RESTRICT needed
  └─ audit_log (admin_user_id) → RESTRICT needed

badges
  ├─ checkins (badge_id) → RESTRICT needed
  ├─ visitors (temporary_badge_id) → SET NULL needed
  └─ event_checkins (badge_id) → RESTRICT needed

events
  ├─ visitors (event_id) → CASCADE needed
  └─ event_attendees (already CASCADE ✓)

divisions
  └─ members (division_id) → RESTRICT needed
```

## Implementation Checklist

- [ ] Review FK constraint strategy (CASCADE vs RESTRICT vs SET NULL)
- [ ] Run orphaned record validation queries (in migration-006-template.sql)
- [ ] Copy migration-006-template.sql to migrations/006_referential_integrity.sql
- [ ] Apply migration to development database
- [ ] Test CASCADE behavior
- [ ] Test RESTRICT error handling
- [ ] Update 4 repository files with FK error catching
- [ ] Add user-friendly error messages
- [ ] Test in development
- [ ] Deploy migration + code together
- [ ] Monitor for FK errors in production

## Soft Delete Note

Members use `status='inactive'` soft delete, NOT hard delete.
- This is GOOD (audit trail preserved)
- But creates FK confusion (inactive members still have IDs)
- Solution: Cascade checkins to members (they're historical anyway)
- Recommendation: Add schema comment explaining soft delete pattern

## Timeline Estimate

- Database migration: 1-2 hours
- Application code changes: 2-3 hours
- Testing: 1 hour
- **Total**: ~4-6 hours

