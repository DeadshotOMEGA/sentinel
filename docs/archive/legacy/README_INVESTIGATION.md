# Sentinel Nominal Roll Import - Investigation & Implementation Guide

Complete architectural analysis and implementation plan for adding CSV bulk member import functionality to the Sentinel RFID attendance system.

## Documentation Index

### Start Here (5 minutes)
- **[INVESTIGATION_SUMMARY.txt](./INVESTIGATION_SUMMARY.txt)** - Quick overview of findings, key files, and next steps

### Deep Dive (30-45 minutes)
1. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Copy-paste code patterns and quick lookups
   - File locations by functionality
   - API endpoint reference
   - Database schema summary
   - Code pattern templates
   - Common SQL snippets
   - Environment variables

2. **[NOMINAL_ROLL_INVESTIGATION.md](./NOMINAL_ROLL_INVESTIGATION.md)** - Comprehensive technical analysis
   - Backend API structure (routes, patterns, endpoints)
   - Database layer (connection, repositories, schema)
   - Frontend pages and components
   - Complete shared type system
   - Division seeding and codes
   - Existing file upload patterns
   - Authentication and authorization
   - Data flow architecture
   - Environment configuration
   - Code quality patterns
   - Performance considerations

### Implementation Guide (1-2 days of development)
- **[NOMINAL_ROLL_IMPLEMENTATION_PLAN.md](./NOMINAL_ROLL_IMPLEMENTATION_PLAN.md)** - Step-by-step implementation
   - Phase 1: Backend - Create Import Endpoint (4 hours)
   - Phase 2: Frontend - Create Import UI (3 hours)
   - Phase 3: Testing & Validation (2 hours)
   - Phase 4: Database Considerations
   - Phase 5: Error Messages for Non-Technical Users
   - Phase 6: CSV Template & Documentation
   - Implementation checklist
   - Estimated effort breakdown
   - Future enhancements
   - Architecture diagram

## Key Findings

### Architecture is Ready ✓
- PostgreSQL database with proper schema
- Express API with route structure and validation patterns
- Repository pattern for data access
- Frontend with modal-based forms
- React Query for state management
- Authentication and authorization middleware
- Error handling framework

### What Needs to Be Built
1. CSV parsing and validation service
2. Bulk import API endpoint
3. File upload UI component
4. Integration into member page

### Recommended Implementation Approach
- **Send CSV as JSON text** in request body (simplest)
- Use `papaparse` library for CSV parsing
- Transaction-based bulk insert with rollback on error
- Per-row error tracking and reporting

## Quick Facts

| Aspect | Detail |
|--------|--------|
| **Estimated Effort** | 9.5 hours (~1-2 days) |
| **Backend Work** | 4 hours (service + route + repo) |
| **Frontend Work** | 3 hours (modal + button + integration) |
| **Testing/Polish** | 2.5 hours |
| **New Dependencies** | papaparse (CSV parsing) |
| **Existing Divisions** | OPS, ADMIN, TRAIN, CMD |
| **Test Members** | 25 active + 1 inactive (seeded) |
| **Database** | PostgreSQL, no ORM, raw SQL |
| **API Pattern** | Express + Zod validation + custom errors |

## Files to Create

```
/backend/src/services/import-service.ts       CSV parsing & validation
/backend/src/routes/members/import.ts         OR add to existing members.ts
/frontend/src/components/ImportModal.tsx      File upload UI
```

## Files to Modify

```
/backend/src/routes/members.ts                Add import route
/backend/src/db/repositories/member-repository.ts  Add bulkImport() method
/frontend/src/pages/Members.tsx               Add import button & modal
```

## API Endpoint

**POST /api/members/import**
- Authentication: Required (JWT token)
- Authorization: Admin role only
- Content-Type: application/json
- Input: `{ csv: "ServiceNumber,FirstName,LastName,Rank,DivisionCode,MemberType\nV100001,John,Doe,..." }`
- Output: `{ imported: N, failed: N, errors: [{row, message, details, howToFix}] }`

## Member Type Values

⚠️ **Important:** Database uses underscores, frontend uses hyphens

- **API/Frontend:** `full-time` | `reserve` | `event-attendee`
- **Database:** `full_time` | `reserve`
- **Conversion:** Automatic via `toCamelCase`/`toSnakeCase` helpers

## Division Codes (Case-Sensitive)

- **OPS** - Operations
- **ADMIN** - Administration
- **TRAIN** - Training
- **CMD** - Command

## Getting Started

### Step 1: Read Documentation (45 min)
1. This README (5 min)
2. INVESTIGATION_SUMMARY.txt (10 min)
3. QUICK_REFERENCE.md (15 min)
4. Skim NOMINAL_ROLL_INVESTIGATION.md (10 min)
5. NOMINAL_ROLL_IMPLEMENTATION_PLAN.md (5 min)

### Step 2: Install Dependencies (5 min)
```bash
cd /backend
bun install papaparse
```

### Step 3: Implement Backend (4 hours)
Follow Phase 1 in NOMINAL_ROLL_IMPLEMENTATION_PLAN.md:
1. Create import-service.ts
2. Add bulkImport() to memberRepository
3. Add POST /api/members/import route
4. Test with curl/Postman

### Step 4: Implement Frontend (3 hours)
Follow Phase 2 in NOMINAL_ROLL_IMPLEMENTATION_PLAN.md:
1. Create ImportModal.tsx
2. Add import button to Members page
3. Test file upload and import flow

### Step 5: Test & Polish (2.5 hours)
Follow Phase 3-6:
1. Test valid imports
2. Test error cases
3. Documentation and templates

## Common Patterns (See QUICK_REFERENCE.md)

### Route Handler Template
```typescript
router.post('/import', requireAuth, requireRole('admin'), 
  async (req, res, next) => {
    try {
      // Handle request
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
```

### Repository Query Pattern
```typescript
async findAll(filters?: Filters): Promise<Type[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  
  if (filters?.divisionId) {
    conditions.push(`m.division_id = $${++paramIndex}`);
    params.push(filters.divisionId);
  }
  
  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const query = `SELECT * FROM table ${whereClause}`;
  
  return this.queryAll(query, params);
}
```

### Transaction Pattern
```typescript
const client = await this.beginTransaction();
try {
  // Insert rows
  await this.commitTransaction(client);
} catch (error) {
  await this.rollbackTransaction(client);
  throw error;
}
```

### Frontend API Call
```typescript
const { data, isLoading, refetch } = useQuery({
  queryKey: ['members'],
  queryFn: async () => {
    const response = await api.get<{ members: Member[] }>('/members');
    return response.data;
  },
});
```

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Service number already exists",
    "details": "Service number V123456 is already in the system",
    "howToFix": "Use a unique service number or remove duplicate rows"
  }
}
```

## Test Data

### Pre-Seeded Divisions
- OPS: 9 members
- ADMIN: 6 members
- TRAIN: 6 members
- CMD: 5 members

### Sample CSV for Testing
```csv
ServiceNumber,FirstName,LastName,Rank,DivisionCode,MemberType
V200001,Alice,Johnson,CPO1,OPS,full-time
V200002,Bob,Smith,PO1,ADMIN,reserve
V200003,Carol,White,LS,TRAIN,full-time
```

## Important Notes

### Type System
- Frontend/Zod: `'full-time'` (hyphen)
- Database: `'full_time'` (underscore)
- Repository converts automatically

### Authentication
- All endpoints require JWT token
- Import endpoint requires `admin` role
- Token added by axios interceptor

### Validation
- Service numbers must be unique
- Division codes must exist
- All required fields must be present
- Member type must be valid

### Performance
- Service number index exists
- Division FK index exists
- Use transactions for bulk inserts
- Consider batching for 1000+ rows

## Next Steps

1. **Read:** Start with INVESTIGATION_SUMMARY.txt
2. **Learn:** Review QUICK_REFERENCE.md patterns
3. **Plan:** Read NOMINAL_ROLL_IMPLEMENTATION_PLAN.md
4. **Code:** Follow Phase 1 (backend), Phase 2 (frontend)
5. **Test:** Follow Phase 3 (testing)
6. **Document:** Follow Phase 6 (documentation)

## Questions?

All answers are in the detailed documentation:
- **"How do I structure the route?"** → QUICK_REFERENCE.md, Route Handler Template
- **"What error classes should I use?"** → QUICK_REFERENCE.md, Error Response Format
- **"How do transactions work?"** → QUICK_REFERENCE.md, Transaction Pattern
- **"What types are available?"** → NOMINAL_ROLL_INVESTIGATION.md, Section 4
- **"What are the divisions?"** → NOMINAL_ROLL_INVESTIGATION.md, Section 5

---

**Investigation Complete:** 2,287 lines of documentation
**Estimated Implementation Time:** 9.5 hours (~1-2 days)
**Architecture Status:** Ready ✓

Good luck! 🚀
