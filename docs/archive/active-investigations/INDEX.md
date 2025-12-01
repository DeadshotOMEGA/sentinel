# HIGH-9 Investigation: Referential Integrity Constraints

## Overview

Complete investigation of missing/incomplete foreign key constraints in Sentinel database schema. 9 missing CASCADE/RESTRICT rules identified plus 1 missing FK entirely.

**Severity**: HIGH  
**Category**: Data Integrity / Database Schema  
**Status**: Investigation Complete - Ready for Implementation

---

## Documents (Read in This Order)

### 1. START HERE: QUICK-REFERENCE.md
**Best for**: 5-minute overview
- 3 critical issues summarized
- All FK relationships at a glance
- Implementation checklist
- Timeline estimate

### 2. HIGH-9-EXECUTIVE-SUMMARY.md
**Best for**: 10-minute executive briefing
- Problem statement
- Key findings (critical/medium/secondary)
- Solution overview
- Risk assessment
- Decision points

### 3. fk-constraints-summary.txt
**Best for**: Technical reference
- All 9 constraints listed
- Current vs. recommended status
- Application code impact
- Soft delete pattern note

### 4. referential-integrity-investigation.md
**Best for**: Complete technical analysis
- Detailed orphaned record scenarios
- Specific FK constraint recommendations with SQL
- Implementation plan (3 phases)
- Risk assessment (detailed)
- Files affected

### 5. migration-006-template.sql
**Best for**: Database implementation
- Ready-to-use migration SQL
- Validation queries (find orphaned records BEFORE running)
- Rollback procedures
- Post-migration tests

---

## Key Findings at a Glance

### CRITICAL (Fix Immediately)

1. **checkins.member_id** → members(id): NO CASCADE
   - Risk: 1M+ orphaned checkins if member deactivated
   - Fix: `ON DELETE CASCADE`

2. **badges.assigned_to_id** → members(id): MISSING FK ENTIRELY!
   - Risk: Can assign badge to non-existent member
   - Fix: `ADD CONSTRAINT ... ON DELETE SET NULL`

3. **visitors.host_member_id** → members(id): NO RESTRICT
   - Risk: Can't prevent host member deletion with active visitors
   - Fix: `ON DELETE RESTRICT`

### MEDIUM (Soon After)

4. **checkins.badge_id** → badges(id): NO RESTRICT
5. **visitors.temporary_badge_id** → badges(id): NO SET NULL
6. **visitors.event_id** → events(id): NO CASCADE

### SECONDARY (Standard Fix)

7. **audit_log.admin_user_id** → admin_users(id): NO RESTRICT
8. **event_checkins.badge_id** → badges(id): NO RESTRICT
9. **members.division_id** → divisions(id): NO RESTRICT

---

## Schema Files

| File | Location | Status |
|------|----------|--------|
| Current Schema | `/home/sauk/projects/sentinel/backend/db/schema.sql` | PRIMARY |
| Initial Migration | `/home/sauk/projects/sentinel/backend/db/migrations/001_initial_schema.sql` | BASE |
| Event Tables | `/home/sauk/projects/sentinel/backend/db/migrations/002_event_attendees.sql` | PARTIAL (has CASCADE ✓) |

---

## Implementation Path

### Phase 1: Database (1-2 hours)
1. Review validation queries in migration-006-template.sql
2. Run migration/006_referential_integrity.sql
3. Test CASCADE/RESTRICT behavior

### Phase 2: Application Code (2-3 hours)
1. Update 4 repository files with FK error handling
2. Add user-friendly error messages (catch PostgreSQL error 23503)
3. Test error scenarios

### Phase 3: Testing (1 hour)
1. Test CASCADE deletion
2. Test RESTRICT prevents deletion
3. Test SET NULL gracefully degrades

**Total Estimate**: 4-6 hours

---

## Files Needing Code Changes

```
/home/sauk/projects/sentinel/backend/src/db/repositories/
  ├─ member-repository.ts           (line 298: add FK error handling)
  ├─ badge-repository.ts            (add delete method + error handling)
  ├─ event-repository.ts            (verify delete exists + error handling)
  └─ visitor-repository.ts          (add FK error handling)

/home/sauk/projects/sentinel/backend/db/migrations/
  └─ 006_referential_integrity.sql  (NEW - ready-to-use SQL provided)
```

---

## How to Use These Documents

### If You Need to...

**Understand the problem quickly**
→ Read QUICK-REFERENCE.md (5 min)

**Brief your team**
→ Read HIGH-9-EXECUTIVE-SUMMARY.md (10 min)

**Get technical details**
→ Read referential-integrity-investigation.md (20 min)

**Implement the fix**
→ Use migration-006-template.sql + code changes (4-6 hours)

**Get a checklist**
→ Use QUICK-REFERENCE.md implementation checklist

---

## Database Relationship Map

```
members (soft-deleted, NOT hard-deleted)
  ├─ id → checkins.member_id [NOW: NO CASCADE → NEED: CASCADE]
  ├─ id → badges.assigned_to_id [NOW: MISSING FK → NEED: SET NULL]
  ├─ id → visitors.host_member_id [NOW: NO RESTRICT → NEED: RESTRICT]
  ├─ id → audit_log.admin_user_id [NOW: NO RESTRICT → NEED: RESTRICT]
  └─ division_id → divisions.id [NOW: NO RESTRICT → NEED: RESTRICT]

badges
  ├─ id → checkins.badge_id [NOW: NO RESTRICT → NEED: RESTRICT]
  ├─ id → visitors.temporary_badge_id [NOW: NO SET NULL → NEED: SET NULL]
  └─ id → event_checkins.badge_id [NOW: NO RESTRICT → NEED: RESTRICT]

events
  ├─ id → visitors.event_id [NOW: NO CASCADE → NEED: CASCADE]
  └─ id → event_attendees.event_id [ALREADY CASCADE ✓]

divisions
  └─ id → members.division_id [NOW: NO RESTRICT → NEED: RESTRICT]
```

---

## Important Notes

### Soft Delete Pattern

Members table uses soft delete (`status='inactive'`), NOT hard delete:
- GOOD: Preserves audit trail
- BUT: Inactive members still exist with IDs
- SOLUTION: CASCADE checkins (they're historical anyway)

### Error Handling

When FK constraints cause deletion to fail:
- PostgreSQL error code: `23503`
- Application should catch and convert to user-friendly message
- Example: "Cannot delete member - has active visitors. Delete/reassign visitors first."

### Validation

Before running migration:
- Run orphaned record queries (provided in migration-006-template.sql)
- Fix any orphaned records first
- This ensures migration succeeds without constraint violations

---

## Next Steps

1. **Approve Strategy**: Review and approve FK constraint strategy (CASCADE vs RESTRICT vs SET NULL)
2. **Run Migration**: Execute migration/006_referential_integrity.sql
3. **Update Code**: Modify 4 repository files with FK error handling
4. **Test**: Verify CASCADE/RESTRICT behavior in development
5. **Deploy**: Run migration + code changes together

---

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| QUICK-REFERENCE.md | ~150 | 5-min overview + checklist |
| HIGH-9-EXECUTIVE-SUMMARY.md | ~120 | 10-min briefing |
| fk-constraints-summary.txt | ~200 | Technical reference table |
| referential-integrity-investigation.md | ~500 | Full analysis + detailed recommendations |
| migration-006-template.sql | ~300 | Ready-to-use migration + validation |
| README.md | ~200 | This file |

---

**Investigation Completed**: 2025-11-29  
**Severity**: HIGH  
**Status**: Ready for Implementation  
**Estimated Implementation Time**: 4-6 hours
