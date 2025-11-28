# Implementation Plan: Nominal Roll CSV Import Feature

## Executive Summary

The Sentinel RFID system is ready to support CSV bulk import of members (Nominal Roll). All infrastructure is in place:
- ✅ PostgreSQL database with member/division schema
- ✅ Repository pattern for database access
- ✅ Express API with route structure & validation patterns
- ✅ Frontend with modal-based forms
- ✅ React Query for server state management
- ✅ Authentication & authorization middleware
- ✅ Error handling framework
- ❌ File upload endpoint (needs creation)
- ❌ CSV parsing logic (needs creation)
- ❌ Frontend import UI (needs creation)

---

## Phase 1: Backend - Create Import Endpoint

### 1.1 Create Import Service (`/backend/src/services/import-service.ts`)

**Responsibilities:**
- Parse CSV text into objects
- Validate column headers
- Resolve division codes to IDs
- Check for duplicate service numbers
- Return structured error list

**Input format (CSV):**
```csv
ServiceNumber,FirstName,LastName,Rank,DivisionCode,MemberType
V100001,John,Doe,CPO1,OPS,full-time
V100002,Jane,Smith,PO1,ADMIN,reserve
```

**Processing logic:**
1. Parse CSV (use `papaparse` library - add to package.json)
2. For each row:
   - Extract fields
   - Validate required fields
   - Resolve divisionCode → divisionId via division repository
   - Check if service number already exists
   - Build validation result: { success: true|false, member?: {...}, errors?: [...] }
3. Return summary: { imported: N, failed: N, errors: [{row, message, details}] }

**Example method signature:**
```typescript
async function importMembersFromCSV(
  csvText: string,
  divisionRepository: DivisionRepository,
  memberRepository: MemberRepository
): Promise<ImportResult> {
  const parsed = Papa.parse(csvText, { header: true });
  const results: ImportResult = { imported: 0, failed: 0, errors: [] };

  for (let rowNum = 2; rowNum <= parsed.data.length; rowNum++) {
    try {
      // Validate and process row
    } catch (error) {
      results.errors.push({ row: rowNum, message: error.message });
      results.failed++;
    }
  }

  return results;
}
```

### 1.2 Add Import Route (`/backend/src/routes/members.ts`)

**Endpoint:** `POST /api/members/import`
**Auth:** requireAuth + requireRole('admin')
**Content-Type:** application/json (send CSV as text in body)

**Request body:**
```json
{
  "csv": "ServiceNumber,FirstName,LastName,Rank,DivisionCode,MemberType\nV100001,John,Doe,CPO1,OPS,full-time\n..."
}
```

**Response format:**
```json
{
  "imported": 25,
  "failed": 2,
  "errors": [
    {
      "row": 15,
      "serviceNumber": "V999999",
      "message": "Service number already exists",
      "details": "A member with service number V999999 is already in the system",
      "howToFix": "Update the CSV with a unique service number or remove this row"
    },
    {
      "row": 28,
      "message": "Division not found",
      "details": "Division code 'INVALID' does not exist",
      "howToFix": "Valid divisions are: OPS, ADMIN, TRAIN, CMD"
    }
  ],
  "summary": "Successfully imported 25 of 27 rows"
}
```

**Handler outline:**
```typescript
router.post('/import', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { csv } = req.body;

    if (!csv) {
      throw new ValidationError('CSV data required', 'No CSV content provided',
        'Include CSV text in request body');
    }

    const result = await importMembersFromCSV(csv, divisionRepository, memberRepository);

    res.json(result);
  } catch (err) {
    next(err);
  }
});
```

### 1.3 Add Bulk Insert to Member Repository

**Method: `bulkImport(members: CreateMemberInput[])`**

```typescript
async bulkImport(members: CreateMemberInput[]): Promise<{ imported: number; failed: number; errors: ImportError[] }> {
  const client = await this.beginTransaction();
  const results = { imported: 0, failed: 0, errors: [] };

  try {
    for (const member of members) {
      try {
        const query = `
          INSERT INTO members (
            service_number, first_name, last_name, rank, division_id,
            member_type, status, email, phone, badge_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;

        await client.query(query, [
          member.serviceNumber,
          member.firstName,
          member.lastName,
          member.rank,
          member.divisionId,
          member.memberType,
          member.status || 'active',
          member.email || null,
          member.phone || null,
          member.badgeId || null,
        ]);

        results.imported++;
      } catch (rowError) {
        results.failed++;
        results.errors.push({
          serviceNumber: member.serviceNumber,
          message: (rowError as Error).message,
        });
      }
    }

    await this.commitTransaction(client);
  } catch (error) {
    await this.rollbackTransaction(client);
    throw error;
  }

  return results;
}
```

### 1.4 Install CSV Library

**Add to `/backend/package.json`:**
```json
"dependencies": {
  "papaparse": "^5.4.1"
}
```

Then run: `bun install`

### 1.5 Update `/backend/src/routes/index.ts`

Mount the new route if creating separate file. Otherwise, add directly to members.ts.

---

## Phase 2: Frontend - Create Import UI

### 2.1 Create Import Modal (`/frontend/src/components/ImportModal.tsx`)

**Features:**
- File upload or text area for CSV
- Preview of first few rows
- Import button with loading state
- Success message showing count
- Error list with row numbers and messages
- Validation before sending

**Component structure:**
```typescript
interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;  // Trigger parent refetch
}

export default function ImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setCsvText(text);
    generatePreview(text);
  };

  const generatePreview = (text: string) => {
    // Parse CSV and show first 5 rows
  };

  const handleImport = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post<ImportResult>('/members/import', {
        csv: csvText,
      });

      setResult(response.data);

      if (response.data.failed === 0) {
        // Close modal after brief success message
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError('Import failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalContent>
        <ModalHeader>Import Members (Nominal Roll)</ModalHeader>

        <ModalBody>
          {!result ? (
            <>
              {error && <div className="text-danger">{error}</div>}

              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                label="Select CSV file"
              />

              <Textarea
                label="Or paste CSV text"
                value={csvText}
                onValueChange={setCsvText}
                minRows={8}
                placeholder="ServiceNumber,FirstName,LastName,..."
              />

              {preview.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Preview ({preview.length} rows):</p>
                  <Table size="sm">
                    <TableHeader>
                      <TableColumn>SERVICE #</TableColumn>
                      <TableColumn>NAME</TableColumn>
                      <TableColumn>RANK</TableColumn>
                      <TableColumn>DIVISION</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row.ServiceNumber}</TableCell>
                          <TableCell>{row.FirstName} {row.LastName}</TableCell>
                          <TableCell>{row.Rank}</TableCell>
                          <TableCell>{row.DivisionCode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-success-50 p-4">
                <p className="font-semibold text-success">
                  Import Complete: {result.imported} imported, {result.failed} failed
                </p>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-danger">Errors:</p>
                  {result.errors.map((err, i) => (
                    <div key={i} className="rounded bg-danger-50 p-2 text-sm text-danger">
                      <p className="font-mono">Row {err.row}: {err.message}</p>
                      <p className="text-xs">{err.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              color="primary"
              onPress={handleImport}
              isLoading={isLoading}
              isDisabled={!csvText}
            >
              Import
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```

### 2.2 Add Import Button to Members Page

**File: `/frontend/src/pages/Members.tsx`**

```typescript
const [isImportOpen, setIsImportOpen] = useState(false);

// In JSX, add button:
<div className="flex flex-wrap items-center gap-4">
  {/* ... existing search input ... */}
  <div className="flex-1" />
  <Button color="secondary" onPress={() => setIsImportOpen(true)}>
    Import CSV
  </Button>
  <Button color="primary" onPress={handleAdd}>
    Add Member
  </Button>
</div>

// Add modal at bottom:
<ImportModal
  isOpen={isImportOpen}
  onClose={() => setIsImportOpen(false)}
  onSuccess={() => refetch()}
/>
```

### 2.3 (Optional) Create Import Hook

**File: `/frontend/src/hooks/useImport.ts`**

```typescript
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ImportResult } from '@shared/types';

export function useImport() {
  return useMutation({
    mutationFn: async (csv: string): Promise<ImportResult> => {
      const response = await api.post<ImportResult>('/members/import', { csv });
      return response.data;
    },
  });
}
```

Then use in modal:
```typescript
const { mutate: importMembers, isPending } = useImport();

const handleImport = () => {
  importMembers(csvText, {
    onSuccess: (result) => setResult(result),
    onError: () => setError('Import failed'),
  });
};
```

---

## Phase 3: Testing & Validation

### 3.1 Test CSV Format

**Valid CSV (should import all 3):**
```csv
ServiceNumber,FirstName,LastName,Rank,DivisionCode,MemberType
V200001,Alice,Johnson,CPO1,OPS,full-time
V200002,Bob,Smith,PO1,ADMIN,reserve
V200003,Carol,White,LS,TRAIN,full-time
```

### 3.2 Test Error Cases

**Duplicate service number:**
```csv
ServiceNumber,FirstName,LastName,Rank,DivisionCode,MemberType
V123456,Test,User,MS,OPS,full-time
```
(V123456 already exists in seed data)

**Invalid division:**
```csv
ServiceNumber,FirstName,LastName,Rank,DivisionCode,MemberType
V200004,Dave,Brown,MS,INVALID,full-time
```

**Missing required field:**
```csv
ServiceNumber,FirstName,LastName,Rank,DivisionCode,MemberType
V200005,,Davis,MS,OPS,full-time
```

### 3.3 Test Validation

- ✅ Service numbers are max 20 chars
- ✅ Names are max 100 chars
- ✅ Rank is max 50 chars
- ✅ Member type is only 'full-time' or 'reserve'
- ✅ Division code maps to existing division
- ✅ No duplicate service numbers
- ✅ CSV has correct headers
- ✅ All required fields present

---

## Phase 4: Database Considerations

### 4.1 Performance

**Bulk insert strategy:**
- Use transaction for atomicity
- Insert all-or-nothing per transaction
- Or: Insert with try/catch per row, track errors separately

**Index optimization:**
- Service number index already exists: `idx_members_service_number`
- Division FK index already exists: `idx_members_division`
- No additional indexes needed

### 4.2 Data Validation

**At database level:**
- NOT NULL constraints on required fields
- UNIQUE constraint on service_number (will catch duplicates)
- FOREIGN KEY constraint on division_id (will catch invalid divisions)
- CHECK constraint on member_type values

**At application level (before DB):**
- Zod schema validation
- Division code → ID resolution
- Duplicate service number check (optional, but good UX)

### 4.3 Rollback Strategy

**Option 1: All-or-nothing (current)** ✅
- Start transaction
- Insert all members
- Commit on success, rollback on any error
- Return error to user, user fixes CSV and retries
- Good for: Data integrity, but requires perfect CSV

**Option 2: Partial success** (optional future)
- Start transaction
- Try insert each member individually
- Track success/failure per row
- Commit successful inserts, skip failed rows
- Return detailed error list
- Good for: Large imports with minor issues

Currently recommend Option 1 (all-or-nothing) for safety.

---

## Phase 5: Error Messages for Non-Technical Admins

**Error messages should be clear and actionable:**

### Service Number Already Exists
```
Message: Service number V123456 already exists
Details: A member with this service number is already in the system
How to Fix: Check if this is a duplicate row in your CSV, or use a different service number
```

### Division Not Found
```
Message: Division code BADCODE is not valid
Details: Valid divisions are: OPS, ADMIN, TRAIN, CMD
How to Fix: Update the CSV with a valid division code from the list above
```

### Invalid Member Type
```
Message: Member type 'invalid' is not recognized
Details: Member type must be either 'full-time' or 'reserve'
How to Fix: Change the value in your CSV to one of the valid options
```

### Missing Required Field
```
Message: Row 5 is missing required field 'FirstName'
Details: All rows must have: ServiceNumber, FirstName, LastName, Rank, DivisionCode, MemberType
How to Fix: Add the missing field to this row or remove the row if data is unavailable
```

---

## Phase 6: CSV Template & Documentation

### 6.1 Template CSV (provide to users)

**File: `/frontend/public/member-import-template.csv`**

```csv
ServiceNumber,FirstName,LastName,Rank,DivisionCode,MemberType
V200001,John,Doe,CPO1,OPS,full-time
V200002,Jane,Smith,PO1,ADMIN,reserve
```

### 6.2 User Documentation

**Create file: `/docs/NOMINAL_ROLL_IMPORT.md`**

```markdown
# Nominal Roll CSV Import Guide

## Format
Your CSV must have these exact columns (in any order):
- ServiceNumber (max 20 chars, must be unique)
- FirstName (max 100 chars)
- LastName (max 100 chars)
- Rank (max 50 chars)
- DivisionCode (must match existing division: OPS, ADMIN, TRAIN, CMD)
- MemberType (full-time or reserve)

## Valid Division Codes
- OPS: Operations
- ADMIN: Administration
- TRAIN: Training
- CMD: Command

## Example
[Include template CSV]

## Troubleshooting
[Include common errors and fixes]
```

---

## Implementation Checklist

### Backend
- [ ] Install `papaparse` library
- [ ] Create `/backend/src/services/import-service.ts`
- [ ] Add `bulkImport()` method to MemberRepository
- [ ] Add `POST /api/members/import` route
- [ ] Test endpoint with curl/Postman
- [ ] Test error cases
- [ ] Add Zod schema validation
- [ ] Add proper error messages with howToFix

### Frontend
- [ ] Create `/frontend/src/components/ImportModal.tsx`
- [ ] Add import button to Members page
- [ ] Add CSV file upload handling
- [ ] Add preview rendering
- [ ] Test file upload
- [ ] Test text paste
- [ ] Add success/error message display
- [ ] Style modal with HeroUI components
- [ ] Test with valid CSV
- [ ] Test with invalid CSV

### Testing
- [ ] Import 10 valid members
- [ ] Import with duplicate service number (should error)
- [ ] Import with invalid division (should error)
- [ ] Import with missing field (should error)
- [ ] Verify members appear in list after import
- [ ] Verify member details are correct
- [ ] Test rollback on error

### Documentation
- [ ] Create user guide
- [ ] Document CSV format
- [ ] Create template CSV file
- [ ] Document error messages
- [ ] Add to README

---

## Estimated Effort

| Phase | Task | Effort | Notes |
|-------|------|--------|-------|
| 1 | Import service & route | 4 hours | CSV parsing, validation, DB logic |
| 2 | Frontend modal & integration | 3 hours | UI components, form handling |
| 3 | Testing & error cases | 2 hours | Manual testing, edge cases |
| 4 | Documentation | 1 hour | User guide, troubleshooting |
| **Total** | | **10 hours** | ~1-2 days development |

---

## Future Enhancements

- [ ] Batch processing with progress bar
- [ ] Download error report (CSV with error details per row)
- [ ] Template download from UI
- [ ] Division management in import (create new divisions if don't exist)
- [ ] Badge assignment during import
- [ ] Email notifications on import completion
- [ ] Audit log entries for all imported members
- [ ] Undo import (rollback transaction within time window)
- [ ] Import history (track all imports, user, date, count)
- [ ] Automatic retry for failed rows

---

## Architecture Diagram

```
User uploads CSV
        ↓
[ImportModal.tsx] Frontend validation & preview
        ↓
POST /api/members/import (JSON with CSV text)
        ↓
[members.ts route] Auth check, call service
        ↓
[import-service.ts] Parse CSV → array of objects
        ↓
For each member:
  ├─ Validate fields (Zod schema)
  ├─ Resolve division code → ID
  ├─ Check duplicate service number
  ├─ Build CreateMemberInput object
        ↓
[memberRepository.bulkImport()]
  ├─ Start transaction
  ├─ Insert each member
  ├─ Commit on success OR Rollback on error
  ├─ Invalidate Redis cache
        ↓
PostgreSQL Database
  ├─ Insert rows with constraints
  ├─ Trigger: update updated_at
  ├─ Trigger: update badge last_used (if badges assigned)
        ↓
Return ImportResult { imported, failed, errors: [{row, message, howToFix}] }
        ↓
[ImportModal.tsx] Display results
        ↓
Refetch members list via React Query
        ↓
Members page updates with new data
```

