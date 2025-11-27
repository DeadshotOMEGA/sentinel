# Nominal Roll Import Feature - Implementation Plan

## Overview
Enable Admins to import member data from Nominal Roll CSV exported from DWAN. This includes schema changes, new fields, updated member types, and an import UI with manual review for removed members.

---

## Phase 1: Database Schema Migration

### 1.1 Update `member_type` enum
**Current:** `full_time | reserve`
**New:** `class_a | class_b | class_c | reg_force`

### 1.2 Add new columns to `members` table
| Column | Type | Source CSV Column |
|--------|------|-------------------|
| `initials` | VARCHAR(10) | INITIALS |
| `mess` | VARCHAR(50) | MESS |
| `moc` | VARCHAR(100) | MOC |
| `home_phone` | VARCHAR(30) | HOME PHONE |
| `mobile_phone` | VARCHAR(30) | MOBILE PHONE |
| `email` | VARCHAR(255) | EMAIL ADDRESS |
| `employee_number` | VARCHAR(20) | EMPL # |
| `class_details` | VARCHAR(100) | DETAILS |

**Note:** Existing `phone` column will be renamed to `mobile_phone`, `email` already exists.

### 1.3 Update `divisions` seed data
New division codes from Nominal Roll:
- BMQ (Basic Military Qualification)
- OPS (Operations)
- DECK (Deck)
- ADMIN (Administration)
- LOG (Logistics)
- BAND (Band)
- TRG (Training)
- CMD (Command)
- PAO (Public Affairs)

### 1.4 Migration file
**File:** `backend/db/migrations/002-nominal-roll-fields.sql`

```sql
-- Add new member_type values
ALTER TABLE members DROP CONSTRAINT members_member_type_check;
ALTER TABLE members ADD CONSTRAINT members_member_type_check
  CHECK (member_type IN ('class_a', 'class_b', 'class_c', 'reg_force'));

-- Add new columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS initials VARCHAR(10);
ALTER TABLE members ADD COLUMN IF NOT EXISTS mess VARCHAR(50);
ALTER TABLE members ADD COLUMN IF NOT EXISTS moc VARCHAR(100);
ALTER TABLE members ADD COLUMN IF NOT EXISTS home_phone VARCHAR(30);
ALTER TABLE members ADD COLUMN IF NOT EXISTS employee_number VARCHAR(20);
ALTER TABLE members ADD COLUMN IF NOT EXISTS class_details VARCHAR(100);

-- Rename phone to mobile_phone
ALTER TABLE members RENAME COLUMN phone TO mobile_phone;

-- Update existing members (convert old types to class_a)
UPDATE members SET member_type = 'class_a' WHERE member_type IN ('full_time', 'reserve');
```

---

## Phase 2: Type Definitions

### 2.1 Update `shared/types/member.ts`

```typescript
export type MemberType = 'class_a' | 'class_b' | 'class_c' | 'reg_force';
export type MemberStatus = 'active' | 'inactive' | 'pending_review';

export interface Member {
  id: string;
  serviceNumber: string;
  employeeNumber?: string;
  rank: string;
  firstName: string;
  lastName: string;
  initials?: string;
  divisionId: string;
  mess?: string;
  moc?: string;
  memberType: MemberType;
  classDetails?: string;
  status: MemberStatus;
  email?: string;
  homePhone?: string;
  mobilePhone?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Add import types

```typescript
export interface NominalRollRow {
  serviceNumber: string;      // SN (normalized, no spaces)
  employeeNumber?: string;    // EMPL #
  rank: string;               // RANK
  lastName: string;           // LAST NAME
  firstName: string;          // FIRST NAME
  initials?: string;          // INITIALS
  department: string;         // DEPT → division code
  mess?: string;              // MESS
  moc?: string;               // MOC
  email?: string;             // EMAIL ADDRESS
  homePhone?: string;         // HOME PHONE
  mobilePhone?: string;       // MOBILE PHONE
  details?: string;           // DETAILS → member_type derivation
}

export interface ImportPreview {
  toAdd: NominalRollRow[];
  toUpdate: { current: Member; incoming: NominalRollRow; changes: string[] }[];
  toReview: Member[];  // Members not in CSV (potential removals)
  errors: { row: number; message: string }[];
}

export interface ImportResult {
  added: number;
  updated: number;
  flaggedForReview: number;
  errors: { row: number; message: string }[];
}
```

---

## Phase 3: Backend Implementation

### 3.1 Update division seed data
**File:** `backend/db/seed/dev-data.sql`

Add new divisions matching Nominal Roll DEPT values.

### 3.2 Create import service
**File:** `backend/src/services/import-service.ts`

Responsibilities:
1. Parse CSV text
2. Normalize service numbers (remove spaces)
3. Derive `member_type` from DETAILS column:
   - "Class A" or empty → `class_a`
   - "Class B" → `class_b`
   - "Class C" → `class_c`
   - "REG FORCE" → `reg_force`
4. Map DEPT to division IDs
5. Generate preview (add/update/review lists)
6. Execute import with transaction

### 3.3 Update member repository
**File:** `backend/src/db/repositories/member-repository.ts`

Add methods:
- `bulkUpsert(members: CreateMemberInput[]): Promise<{ added: number; updated: number }>`
- `flagForReview(memberIds: string[]): Promise<void>`

### 3.4 Add import routes
**File:** `backend/src/routes/members.ts`

```
POST /api/members/import/preview
  Body: { csv: string }
  Response: ImportPreview

POST /api/members/import/execute
  Body: { csv: string, reviewedRemovals: string[] }  // IDs confirmed for deactivation
  Response: ImportResult
```

---

## Phase 4: Frontend Implementation

### 4.1 Update MemberModal form
Add new fields:
- Initials
- Mess
- MOC
- Home Phone (rename Phone to Mobile Phone)
- Member Type dropdown: Class A, Class B, Class C, Reg Force

### 4.2 Update Members table
Add columns (selectable):
- Initials
- Mess
- MOC

Update Member Type chip display:
- Class A → blue
- Class B → green
- Class C → purple
- Reg Force → orange

### 4.3 Create ImportModal component
**File:** `frontend/src/components/ImportModal.tsx`

Features:
1. File picker (CSV only)
2. Paste textarea alternative
3. Preview step:
   - "To Add" table
   - "To Update" table (with change highlights)
   - "Missing from CSV" table with checkboxes for deactivation
4. Confirm step
5. Results summary

### 4.4 Add Import button to Members page
Button next to "Add Member" that opens ImportModal.

---

## Phase 5: CSV Parsing Logic

### 5.1 Column mapping
| CSV Column | DB Column | Transform |
|------------|-----------|-----------|
| SN | service_number | Remove spaces |
| EMPL # | employee_number | None |
| RANK | rank | None |
| LAST NAME | last_name | None |
| FIRST NAME | first_name | None |
| INITIALS | initials | None |
| DEPT | division_id | Lookup by code |
| MESS | mess | None |
| MOC | moc | None |
| EMAIL ADDRESS | email | None |
| HOME PHONE | home_phone | None |
| MOBILE PHONE | mobile_phone | None |
| DETAILS | member_type + class_details | Parse for class type |

### 5.2 Ignored columns (sensitive data)
- TIN
- PASSWORD
- ADDRESS
- CITY
- POST CODE
- DOB
- ENROLMENT
- FORCE TEST EXP
- MED / MED EXP
- ID SERIAL / ID EXP DATE
- START / END / CONTRACT DAYS
- NOTES
- SECURITY CLEARANCE

### 5.3 Validation rules
1. Service number required, must be unique within CSV
2. Rank required
3. First name required
4. Last name required
5. DEPT must match existing division code
6. Email format validation (if provided)

---

## Phase 6: Testing Checklist

- [ ] Schema migration runs without errors
- [ ] Existing members converted correctly
- [ ] CSV parsing handles edge cases (quotes, commas in values)
- [ ] Service number normalization works
- [ ] Member type derivation accurate
- [ ] Division lookup works for all codes
- [ ] Preview shows correct add/update/review counts
- [ ] Import transaction rolls back on error
- [ ] Removed members flagged, not deleted
- [ ] Frontend displays new fields correctly
- [ ] Import modal works on touch devices (kiosk-friendly)

---

## Files to Create/Modify

### New Files
- `backend/db/migrations/002-nominal-roll-fields.sql`
- `backend/src/services/import-service.ts`
- `frontend/src/components/ImportModal.tsx`

### Modified Files
- `backend/db/schema.sql` - Reference schema
- `backend/db/seed/dev-data.sql` - Division seed data
- `backend/src/routes/members.ts` - Import endpoints
- `backend/src/db/repositories/member-repository.ts` - Bulk methods
- `shared/types/member.ts` - New types
- `shared/types/index.ts` - Export new types
- `frontend/src/pages/Members.tsx` - Import button
- `frontend/src/components/MemberModal.tsx` - New fields
- `sentinel/CLAUDE.md` - Document new fields

---

## Implementation Order

1. **Database migration** - Schema changes first
2. **Types** - Update shared types
3. **Backend routes** - Add import endpoints
4. **Frontend updates** - Update existing member UI
5. **Import modal** - Build import feature
6. **Testing** - End-to-end validation

---

## Estimated Effort

| Phase | Hours |
|-------|-------|
| Schema migration | 1 |
| Type definitions | 0.5 |
| Import service | 3 |
| Backend routes | 1 |
| Frontend member updates | 2 |
| Import modal | 4 |
| Testing & polish | 2 |
| **Total** | **~13.5 hours** |
