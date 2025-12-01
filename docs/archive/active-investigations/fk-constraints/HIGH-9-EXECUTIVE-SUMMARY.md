# HIGH-9: Referential Integrity Constraints - Executive Summary

## Problem Statement

Database schema has **9 missing or incomplete foreign key (FK) constraints**, creating risk of **orphaned records** when parents are deleted. Most critical: members can be deactivated but their checkins, badges, and visitor records remain stranded with dangling references.

## Severity: HIGH

- **Data Integrity Risk**: Orphaned records (millions of checkins with dead FK refs)
- **Query Complexity**: Must filter `status='active'` when joining to soft-deleted members
- **Missing FK**: badges.assigned_to_id has NO FK constraint (can assign to non-existent member)
- **Audit Trail Risk**: Deleted admin users leave orphaned audit logs

## Quick Facts

| Metric | Count |
|--------|-------|
| Missing CASCADE/RESTRICT rules | 9 FKs |
| Missing FK entirely | 1 (badges.assigned_to_id) |
| Files needing changes | 4 repositories + 1 new migration |
| Existing orphaned records | UNKNOWN (must validate) |

## Key Findings

### CRITICAL (Do Immediately)

1. **checkins → members**: NO CASCADE
   - Members soft-deleted (status='inactive') but checkins still reference them
   - Need: ON DELETE CASCADE (historical data follows)

2. **badges → members**: MISSING FK ENTIRELY!
   - assigned_to_id column has no constraint
   - Can assign badge to non-existent member ID
   - Need: Add FK with ON DELETE SET NULL

3. **visitors → members**: NO RESTRICT
   - Can't prevent host member deletion with active visitors
   - Need: ON DELETE RESTRICT (prevent accidents)

### MEDIUM (Soon After)

4. **checkins → badges**: NO RESTRICT
5. **visitors → badges**: NO SET NULL
6. **visitors → events**: NO CASCADE

### SECONDARY (Standard Fix)

7. **audit_log → admin_users**: NO RESTRICT
8. **event_checkins → badges**: NO RESTRICT
9. **members → divisions**: NO RESTRICT

## Solution

Create migration/006_referential_integrity.sql with:

```sql
-- CRITICAL FIX #1: Checkins follow member deletion
ALTER TABLE checkins
DROP CONSTRAINT checkins_member_id_fkey,
ADD CONSTRAINT checkins_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id)
  ON DELETE CASCADE;

-- CRITICAL FIX #2: Add missing FK constraint
ALTER TABLE badges
ADD CONSTRAINT badges_assigned_to_id_fkey
  FOREIGN KEY (assigned_to_id) REFERENCES members(id)
  ON DELETE SET NULL;

-- CRITICAL FIX #3: Prevent accidental member deletion
ALTER TABLE visitors
DROP CONSTRAINT visitors_host_member_id_fkey,
ADD CONSTRAINT visitors_host_member_id_fkey
  FOREIGN KEY (host_member_id) REFERENCES members(id)
  ON DELETE RESTRICT;

[... 6 more FKs ...]
```

## Implementation Tasks

### Phase 1: Database (1-2 hours)

1. Review orphaned records validation queries (provided)
2. Run migration/006_referential_integrity.sql
3. Test CASCADE/RESTRICT behavior

### Phase 2: Application Code (2-3 hours)

1. Update deletion methods to catch FK errors (code 23503)
2. Add user-friendly error messages (e.g., "Cannot delete member - has active visitors")
3. Update 4 repository files:
   - member-repository.ts (add error handling to delete)
   - badge-repository.ts (add delete method)
   - event-repository.ts (verify delete exists)
   - visitor-repository.ts (error handling)

### Phase 3: Testing (1 hour)

1. Test CASCADE deletion scenarios
2. Test RESTRICT prevents accidental deletion
3. Test SET NULL gracefully degrades
4. Verify no unexpected data loss

## Files Provided

| File | Purpose |
|------|---------|
| referential-integrity-investigation.md | Full technical analysis |
| fk-constraints-summary.txt | Quick reference table |
| migration-006-template.sql | Ready-to-use migration + validation queries |

## Risk Assessment

**Without Fix**: 
- HIGH risk of orphaned records
- MEDIUM audit trail corruption
- LOW operational impact (constraints not enforced)

**With Fix**:
- Prevents data integrity violations
- Raises clear errors to admins (non-technical friendly)
- Audit trail remains immutable
- No data loss (CASCADE used only for historical data)

## Decision Points

**Question 1**: Should we run full orphaned record scan before migration?
- **Recommended**: YES - Verify database is clean before enforcing constraints

**Question 2**: Hard delete or soft delete members?
- **Current**: Soft delete (status='inactive')
- **Recommended**: Keep soft delete + CASCADE (historical data follows)

**Question 3**: When should FK errors display to user?
- **Recommended**: When trying to delete parent with children:
  - "Cannot delete member - has active visitors. Delete/reassign visitors first."
  - "Cannot delete division - has 5 members assigned. Reassign them first."

## Next Steps

1. **Approve** FK constraint strategy (CASCADE vs RESTRICT vs SET NULL)
2. **Create** migration/006_referential_integrity.sql in repository
3. **Update** deletion methods in 4 repositories
4. **Test** in development environment
5. **Deploy** migration + code together
6. **Monitor** for any FK constraint violation errors in production

---

**Status**: Investigation Complete - Ready for Implementation  
**Created**: 2025-11-29  
**Severity**: HIGH  
**Category**: Data Integrity / Database Schema
