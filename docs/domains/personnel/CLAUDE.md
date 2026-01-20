# Personnel Domain Documentation (AI-First Guide)

**Purpose:** Member, division, rank, and personnel management documentation

**AI Context Priority:** high

**When to Load:** User working on members, personnel, divisions, ranks, badges

**Triggers:** member, personnel, division, rank, badge, service-number

---

## Quick Reference

### What's Here

Documentation for Sentinel's personnel management system:
- Member CRUD operations
- Division management
- Rank structure
- Badge assignment
- Member status and types
- Personnel imports (CSV)

### When to Create Docs Here

**Create personnel docs when:**
- Implementing member management features
- Documenting member API endpoints
- Explaining division hierarchy
- Writing badge assignment guides
- Recording personnel decisions

**File naming:**
- `explanation-member-[topic].md`
- `reference-member-[subject].md`
- `howto-[personnel-task].md`

---

## Personnel System Overview

### Core Entities

**Member:**
- Service number (unique identifier)
- Rank (S3, S2, S1, MS, PO2, PO1, CPO2, CPO1)
- Name (first, last)
- Division assignment
- Status (Active, Inactive, Leave, Discharged)
- Type (Regular, Reserve, Cadet)

**Division:**
- Code (OPS, LOG, ADMIN, etc.)
- Name
- Members list
- Hierarchy

**Badge:**
- Serial number (unique)
- Assignment status
- Member assignment (1:1 or 1:many)
- Badge status (Active, Lost, Damaged, Decommissioned)

### Key Features

- **Member lifecycle** - From enrollment to discharge
- **Badge management** - Assignment, tracking, recovery
- **Division structure** - Organizational hierarchy
- **Bulk import** - CSV import with validation
- **Audit trail** - All changes logged

---

## Code Locations

**Repositories:**
- [apps/backend/src/repositories/member-repository.ts](../../../apps/backend/src/repositories/member-repository.ts)
- [apps/backend/src/repositories/division-repository.ts](../../../apps/backend/src/repositories/division-repository.ts)
- [apps/backend/src/repositories/badge-repository.ts](../../../apps/backend/src/repositories/badge-repository.ts)

**Services:**
- [apps/backend/src/services/member-service.ts](../../../apps/backend/src/services/member-service.ts)
- [apps/backend/src/services/import-service.ts](../../../apps/backend/src/services/import-service.ts)

**Routes:**
- [apps/backend/src/routes/members.ts](../../../apps/backend/src/routes/members.ts)
- [apps/backend/src/routes/divisions.ts](../../../apps/backend/src/routes/divisions.ts)

**Schema:**
- [packages/database/prisma/schema.prisma](../../../packages/database/prisma/schema.prisma) - Member, Division, Badge models

---

## Document Examples

### Explanation Docs
- `explanation-member-lifecycle.md` - Member states and transitions
- `explanation-division-structure.md` - Organizational hierarchy
- `explanation-import-validation.md` - CSV validation rules

### Reference Docs
- `reference-member-api.md` - Member endpoints
- `reference-division-api.md` - Division endpoints
- `reference-rank-structure.md` - Valid ranks and progression

### How-to Docs
- `howto-add-member.md` - Create new member
- `howto-assign-badge.md` - Assign badge to member
- `howto-import-members.md` - Bulk import from CSV
- `howto-transfer-division.md` - Move member between divisions

---

## Testing Requirements

**Member repository:**
- ✅ Create with valid data
- ✅ Unique service number constraint
- ✅ Foreign key to division
- ✅ Update member details
- ✅ Soft delete (status change)

**Division repository:**
- ✅ Create division
- ✅ Unique division code
- ✅ List members in division
- ✅ Cannot delete division with members

**Import service:**
- ✅ Valid CSV parsing
- ✅ Duplicate detection
- ✅ Invalid rank handling
- ✅ Transaction rollback on error

**See:** [Testing Strategy](../../cross-cutting/testing/explanation-integration-first.md)

---

## Related Documentation

**Related domains:**
- [Check-in Domain](../checkin/CLAUDE.md) - Badge scanning
- [Events Domain](../events/CLAUDE.md) - Temporary access

**Implementation:**
- [Backend Rebuild Plan](../../plans/active/backend-rebuild-plan.md)

---

**Last Updated:** 2026-01-19
