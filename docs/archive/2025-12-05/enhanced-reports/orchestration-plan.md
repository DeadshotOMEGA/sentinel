# Enhanced Reports - Orchestration Plan

> **Created**: 2025-12-04
> **Status**: Ready for Implementation

## Executive Summary

The Enhanced Reports feature will be implemented across **4 parallel work streams** with clear dependencies. Total estimated effort: 5 major work packages requiring sequential phases.

### Critical Path
1. **Phase 0**: Database migrations (BLOCKS everything)
2. **Phase 1**: Parallel implementation (4 streams)
3. **Phase 2**: Integration testing & validation

---

## Work Stream Breakdown

### Stream A: Database Foundation & Migrations
**Owner**: Database specialist agent
**Duration**: 1 task block
**Blocks**: All other streams

**Tasks**:
1. Create migration files for all new tables
2. Implement settings data access layer
3. Implement BMQ data access layer
4. Create seed data for initial settings

**Deliverables**:
- `backend/db/migrations/XXX_enhanced_reports_tables.sql`
- `backend/src/services/settings-service.ts`
- `backend/src/services/bmq-service.ts`
- `backend/src/services/training-year-service.ts`

---

### Stream B: Backend API Routes
**Owner**: Backend API specialist agent
**Duration**: 1 task block
**Depends On**: Stream A completion
**Blocks**: Stream C (Frontend UI)

**Tasks**:
1. Settings CRUD API routes
2. Training Year API routes
3. BMQ Courses CRUD API routes
4. BMQ Enrollments API routes
5. Report audit logging middleware

**Deliverables**:
- `backend/src/routes/settings.ts`
- `backend/src/routes/training-years.ts`
- `backend/src/routes/bmq-courses.ts`
- `backend/src/routes/bmq-enrollments.ts`
- Route registration in `backend/src/routes/index.ts`

---

### Stream C: Frontend Settings UI
**Owner**: Frontend UI specialist agent
**Duration**: 1 task block
**Depends On**: Stream B completion
**Parallel With**: Stream D (PDF System)

**Tasks**:
1. Restructure Settings page with tabs
2. Training Year configuration UI
3. Working Hours configuration UI
4. Report Settings UI (thresholds, formatting)
5. BMQ Courses management UI
6. Member profile BMQ enrollment section

**Deliverables**:
- `frontend/src/pages/Settings/SettingsPage.tsx` (refactored)
- `frontend/src/pages/Settings/TrainingYearSettings.tsx`
- `frontend/src/pages/Settings/WorkingHoursSettings.tsx`
- `frontend/src/pages/Settings/ReportSettings.tsx`
- `frontend/src/pages/Settings/BMQCourses.tsx`
- `frontend/src/components/BMQEnrollmentManager.tsx`

---

### Stream D: PDF Generation System
**Owner**: PDF specialist agent
**Duration**: 1 task block
**Depends On**: Stream A completion (for data queries)
**Parallel With**: Stream C (Frontend UI)

**Tasks**:
1. Install and configure @react-pdf/renderer
2. Create letterhead component (header + footer)
3. Create reusable PDF table components
4. Create PDF color theme utilities (threshold flags)
5. Create browser print stylesheets

**Deliverables**:
- `frontend/src/components/reports/pdf/Letterhead.tsx`
- `frontend/src/components/reports/pdf/PDFTable.tsx`
- `frontend/src/components/reports/pdf/PDFUtils.ts`
- `frontend/src/styles/print.css`
- `frontend/src/components/reports/pdf/ThemeUtils.ts`

---

### Stream E: Report Implementations
**Owner**: Report implementation agents (5 separate agents, parallel)
**Duration**: 1 task block per report
**Depends On**: Stream C + Stream D completion
**Can Run**: All 5 reports in parallel

#### E1: Training Night Attendance Report
**Agent**: Junior Engineer
**Tasks**:
- Attendance calculation logic (training nights, holiday exclusions)
- Threshold flag logic (warning/critical)
- Trend calculation logic (improving/declining)
- PDF component for Training Night Attendance
- Frontend UI filters (period, division, organization)
- CSV export variant

**Deliverables**:
- `frontend/src/services/attendance-calculator.ts`
- `frontend/src/components/reports/TrainingNightAttendanceReport.tsx`
- `frontend/src/components/reports/pdf/TrainingNightPDF.tsx`

#### E2: BMQ Attendance Report
**Agent**: Junior Engineer
**Tasks**:
- BMQ session attendance calculation
- BMQ-specific threshold logic
- PDF component for BMQ Attendance
- Frontend UI filters (course selection)

**Deliverables**:
- `frontend/src/services/bmq-attendance-calculator.ts`
- `frontend/src/components/reports/BMQAttendanceReport.tsx`
- `frontend/src/components/reports/pdf/BMQAttendancePDF.tsx`

#### E3: Personnel Status Roster
**Agent**: Junior Engineer
**Tasks**:
- Member roster data fetching
- Sorting logic (by division, rank, alphabetical)
- PDF component for Personnel Roster
- Frontend UI filters (division, sort order)

**Deliverables**:
- `frontend/src/components/reports/PersonnelRoster.tsx`
- `frontend/src/components/reports/pdf/PersonnelRosterPDF.tsx`

#### E4: Visitor Activity Summary
**Agent**: Junior Engineer
**Tasks**:
- Visitor data aggregation (by type, organization)
- Duration calculations
- PDF component for Visitor Summary
- Frontend UI filters (date range, type, organization)

**Deliverables**:
- `frontend/src/components/reports/VisitorSummary.tsx`
- `frontend/src/components/reports/pdf/VisitorSummaryPDF.tsx`

#### E5: Daily Check-In Summary
**Agent**: Junior Engineer
**Tasks**:
- Current presence data aggregation
- Division-based statistics
- PDF component for Daily Summary
- Frontend UI filters (division, classification)

**Deliverables**:
- `frontend/src/components/reports/DailyCheckInSummary.tsx`
- `frontend/src/components/reports/pdf/DailyCheckInPDF.tsx`

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: Database Foundation (Stream A)                     │
│ - Migrations                                                 │
│ - Services (settings, BMQ, training year)                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ Phase 1: Parallel Work Streams                             │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │ Stream B: Backend    │    │ Stream D: PDF System │      │
│  │ API Routes           │    │ - @react-pdf setup   │      │
│  │ - Settings CRUD      │    │ - Letterhead         │      │
│  │ - Training Years     │    │ - Reusable components│      │
│  │ - BMQ CRUD           │    │ - Print styles       │      │
│  └─────────┬────────────┘    └──────────────────────┘      │
│            │                                                 │
│            ▼                                                 │
│  ┌──────────────────────┐                                   │
│  │ Stream C: Frontend   │                                   │
│  │ Settings UI          │                                   │
│  │ - Training Year UI   │                                   │
│  │ - Report Settings UI │                                   │
│  │ - BMQ Courses UI     │                                   │
│  └─────────┬────────────┘                                   │
└────────────┼────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ Phase 2: Report Implementations (All Parallel)              │
│                                                              │
│  E1: Training Night  │  E2: BMQ          │  E3: Personnel   │
│  E4: Visitor Summary │  E5: Daily Check-In                  │
└────────────────────────────────────────────────────────────┘
```

---

## Parallel Execution Groups

### Group 0: Sequential (MUST complete first)
- **Stream A**: Database Foundation
  - **Agent Type**: `programmer`
  - **Estimated Time**: 2-3 hours
  - **Output**: Migration files, service layer

### Group 1: Sequential After Group 0
- **Stream B**: Backend API Routes
  - **Agent Type**: `programmer`
  - **Estimated Time**: 2-3 hours
  - **Output**: API routes, Zod validators

### Group 2: Parallel After Group 1
- **Stream C**: Frontend Settings UI
  - **Agent Type**: `programmer`
  - **Estimated Time**: 3-4 hours
  - **Output**: Settings page components

- **Stream D**: PDF Generation System
  - **Agent Type**: `programmer`
  - **Estimated Time**: 2-3 hours
  - **Output**: PDF components, letterhead

### Group 3: Parallel After Group 2
- **E1, E2, E3, E4, E5**: All Report Implementations
  - **Agent Type**: `junior-engineer` (each)
  - **Estimated Time**: 1-2 hours each
  - **Output**: Report components + PDF variants

---

## Agent Task Specifications

### Agent A1: Database Foundation
**Type**: `programmer`
**Context Files**:
- `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- `/home/sauk/projects/sentinel/backend/db/schema.sql` (review existing schema)
- `/home/sauk/projects/sentinel/backend/db/migrations/` (review migration pattern)

**Task**:
Create database migrations and service layers for the Enhanced Reports feature.

**Specific Deliverables**:
1. Migration file: `backend/db/migrations/XXX_enhanced_reports_tables.sql`
   - Tables: `training_years`, `bmq_courses`, `bmq_enrollments`, `report_settings`, `report_audit_log`
   - Follow exact schema from requirements.md Section "Data Model Additions"
   - Include indexes for foreign keys and frequent queries

2. Service: `backend/src/services/settings-service.ts`
   - CRUD operations for report_settings table
   - Key-value store pattern (key: string, value: JSONB)
   - Default settings initialization

3. Service: `backend/src/services/bmq-service.ts`
   - CRUD for bmq_courses
   - CRUD for bmq_enrollments
   - Query helpers: getActiveCourses(), getMemberEnrollments(memberId)

4. Service: `backend/src/services/training-year-service.ts`
   - CRUD for training_years
   - Helper: getCurrentTrainingYear()
   - Helper: getTrainingNights(startDate, endDate) - returns array of Tuesdays excluding holidays

**Constraints**:
- Use `bun` for package management
- Follow existing service patterns (see `backend/src/services/member-service.ts`)
- Use parameterized queries (no SQL injection risk)
- Include TypeScript types in `shared/types/index.ts`

---

### Agent B1: Backend API Routes
**Type**: `programmer`
**Context Files**:
- `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- `/home/sauk/projects/sentinel/backend/src/routes/members.ts` (pattern reference)
- `/home/sauk/projects/sentinel/backend/src/services/settings-service.ts` (created by Agent A1)
- `/home/sauk/projects/sentinel/backend/src/services/bmq-service.ts` (created by Agent A1)

**Dependencies**: MUST wait for Agent A1 completion

**Task**:
Create RESTful API routes for settings and BMQ management.

**Specific Deliverables**:
1. Route file: `backend/src/routes/settings.ts`
   - `GET /api/settings` - Get all settings
   - `GET /api/settings/:key` - Get specific setting
   - `PUT /api/settings/:key` - Update setting (admin only)
   - `POST /api/settings/bulk` - Bulk update settings
   - Zod validation for all setting values

2. Route file: `backend/src/routes/training-years.ts`
   - `GET /api/training-years` - List all training years
   - `GET /api/training-years/current` - Get current training year
   - `POST /api/training-years` - Create new training year (admin only)
   - `PUT /api/training-years/:id` - Update training year (admin only)
   - `DELETE /api/training-years/:id` - Delete training year (admin only)

3. Route file: `backend/src/routes/bmq-courses.ts`
   - `GET /api/bmq-courses` - List all courses (query: ?active=true)
   - `POST /api/bmq-courses` - Create course (admin only)
   - `PUT /api/bmq-courses/:id` - Update course (admin only)
   - `DELETE /api/bmq-courses/:id` - Delete course (admin only)

4. Route file: `backend/src/routes/bmq-enrollments.ts`
   - `GET /api/bmq-enrollments/member/:memberId` - Get member's enrollments
   - `POST /api/bmq-enrollments` - Enroll member in course (admin only)
   - `PUT /api/bmq-enrollments/:id` - Update enrollment status (admin only)
   - `DELETE /api/bmq-enrollments/:id` - Remove enrollment (admin only)

5. Update `backend/src/routes/index.ts` to mount new routes

6. Middleware: `backend/src/middleware/audit-report.ts`
   - Log report generation to `report_audit_log` table
   - Capture: report_type, report_config, user_id, generation_time_ms

**Constraints**:
- All routes use `requireAuth` middleware
- Admin-only routes use `requireRole('admin')`
- Use Zod for input validation (see existing patterns)
- Return camelCase JSON (use toCamelCase utility)

---

### Agent C1: Frontend Settings UI
**Type**: `programmer`
**Context Files**:
- `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- `/home/sauk/projects/sentinel/frontend/src/pages/Settings/` (existing settings structure)
- `/home/sauk/projects/sentinel/backend/src/routes/settings.ts` (API contract from Agent B1)

**Dependencies**: MUST wait for Agent B1 completion

**Task**:
Create settings UI for training year configuration, report settings, and BMQ course management.

**Specific Deliverables**:
1. Refactor: `frontend/src/pages/Settings/SettingsPage.tsx`
   - Convert to tabbed interface using HeroUI Tabs component
   - Tabs: General | Training Year | Working Hours | Report Settings | BMQ Courses
   - Preserve existing "General" tab content

2. Component: `frontend/src/pages/Settings/TrainingYearSettings.tsx`
   - Form for current training year (start/end dates)
   - Holiday exclusions list (add/remove date ranges with names)
   - Training night schedule (day dropdown, start/end time pickers)
   - Save button with confirmation toast

3. Component: `frontend/src/pages/Settings/WorkingHoursSettings.tsx`
   - Regular hours form (days checkboxes, start/end times)
   - Summer hours form (date range, start/end times)
   - Save button with confirmation toast

4. Component: `frontend/src/pages/Settings/ReportSettings.tsx`
   - Sections: Attendance Thresholds | Member Handling | Formatting
   - All settings from requirements.md "Report Settings" tables
   - Toggle switches, number inputs, select dropdowns
   - Save button with confirmation toast

5. Component: `frontend/src/pages/Settings/BMQCourses.tsx`
   - Table listing active/past BMQ courses
   - Filter: active/inactive toggle
   - Create course modal (name, dates, training day/times)
   - Edit/delete actions per row
   - Confirmation dialogs for destructive actions

6. Component: `frontend/src/components/BMQEnrollmentManager.tsx`
   - Embeddable in member profile page
   - Dropdown to select BMQ course
   - Enroll button
   - List of current/past enrollments with status badges
   - Mark as completed/withdrawn actions

**Constraints**:
- Use HeroUI components (Button, Input, Select, Modal, Table, Tabs)
- Use React Query for data fetching (see existing patterns)
- Form validation using Zod schemas
- Show loading states and error messages
- 48px minimum touch targets

---

### Agent D1: PDF Generation System
**Type**: `programmer`
**Context Files**:
- `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- `/home/sauk/projects/images/hmcs_chippawa_crest.jpg` (letterhead asset)

**Dependencies**: MUST wait for Agent A1 completion (needs data types)

**Task**:
Set up PDF generation infrastructure using @react-pdf/renderer.

**Specific Deliverables**:
1. Install `@react-pdf/renderer` via bun

2. Component: `frontend/src/components/reports/pdf/Letterhead.tsx`
   - Page header: HMCS CHIPPAWA crest (left), unit name, address/contact
   - Page footer: Report title (prop), generated timestamp, "Page X of Y", "UNCLASSIFIED" marking
   - Reusable wrapper for all PDF reports
   - Props: title, children, pageSize (default: "LETTER")

3. Component: `frontend/src/components/reports/pdf/PDFTable.tsx`
   - Reusable table component for PDF reports
   - Props: columns (name, width), rows (data array), alternateRowColors
   - Support for header styling
   - Support for cell alignment (left/center/right)

4. Utility: `frontend/src/components/reports/pdf/ThemeUtils.ts`
   - Color constants (primary, success, warning, danger)
   - Threshold flag color mapper (percentage → color)
   - Typography size/weight constants
   - Spacing constants

5. Stylesheet: `frontend/src/styles/print.css`
   - Hide navigation, sidebars when printing from browser
   - Page break control
   - Clean table rendering
   - Import in main app

6. Example: `frontend/src/components/reports/pdf/SamplePDF.tsx`
   - Simple "Hello World" PDF using Letterhead
   - Demonstrates PDFTable usage
   - For testing during development

**Constraints**:
- Use Inter font family (already in project)
- Follow WCAG AA contrast requirements (4.5:1 minimum)
- Letterhead crest image: use base64 encoding for embedding
- Support both Letter and A4 page sizes

---

### Agent E1: Training Night Attendance Report
**Type**: `junior-engineer`
**Context Files**:
- `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- `/home/sauk/projects/sentinel/frontend/src/components/reports/pdf/Letterhead.tsx` (from Agent D1)
- `/home/sauk/projects/sentinel/frontend/src/components/reports/pdf/PDFTable.tsx` (from Agent D1)
- `/home/sauk/projects/sentinel/backend/src/services/training-year-service.ts` (from Agent A1)

**Dependencies**: MUST wait for Agent C1 + D1 completion

**Task**:
Implement Training Night Attendance report with all filters and organization options.

**Specific Deliverables**:
1. Service: `frontend/src/services/attendance-calculator.ts`
   - Function: `calculateAttendance(member, period, settings)` per requirements.md logic
   - Function: `calculateTrend(member, currentPeriod, settings)`
   - Function: `getThresholdFlag(percentage, settings)` → 'none' | 'warning' | 'critical'
   - Unit tests for edge cases (new members, minimum nights, holidays)

2. Component: `frontend/src/components/reports/TrainingNightAttendanceReport.tsx`
   - Filters UI: Period selector, Division filter, Organization style dropdown
   - Data table preview (before PDF generation)
   - Export buttons: "Download PDF" | "Export CSV"
   - Use React Query to fetch check-in data

3. Component: `frontend/src/components/reports/pdf/TrainingNightPDF.tsx`
   - Uses Letterhead wrapper
   - Table columns: Service #, Rank, Name, Division, Attended/Possible, %, Trend, Flag
   - Color-coded threshold flags (green/yellow/red)
   - Trend arrows (↑/↓/→)
   - "New" badge for members within grace period
   - Support for organization options (full unit, by division, etc.)

4. Add to Reports page: New tab "Training Night Attendance"

**Constraints**:
- Follow attendance calculation logic exactly from requirements.md
- Handle "insufficient data" case (< minimum training nights)
- Exclude holidays from possible nights calculation
- Use settings from report_settings table

---

### Agent E2: BMQ Attendance Report
**Type**: `junior-engineer`
**Context Files**:
- `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- `/home/sauk/projects/sentinel/frontend/src/components/reports/pdf/Letterhead.tsx` (from Agent D1)
- `/home/sauk/projects/sentinel/backend/src/services/bmq-service.ts` (from Agent A1)

**Dependencies**: MUST wait for Agent C1 + D1 completion

**Task**:
Implement BMQ Attendance report with course-specific thresholds.

**Specific Deliverables**:
1. Service: `frontend/src/services/bmq-attendance-calculator.ts`
   - Function: `calculateBMQAttendance(member, bmqCourse, settings)`
   - Use BMQ-specific thresholds if configured
   - Return attended/possible/percentage/flag

2. Component: `frontend/src/components/reports/BMQAttendanceReport.tsx`
   - Filter: BMQ course selector (dropdown of active courses)
   - Data table preview
   - Export buttons: "Download PDF"

3. Component: `frontend/src/components/reports/pdf/BMQAttendancePDF.tsx`
   - Uses Letterhead wrapper
   - Header: Course name, date range, training day/times
   - Table: Service #, Rank, Name, Attended/Possible, %, Flag
   - Color-coded threshold flags using BMQ thresholds

4. Add to Reports page: New tab "BMQ Attendance"

**Constraints**:
- Use BMQ-specific thresholds from settings if enabled
- Only show enrolled members for selected course
- Handle courses with no enrollments gracefully

---

### Agent E3: Personnel Status Roster
**Type**: `junior-engineer`
**Context Files**:
- `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- `/home/sauk/projects/sentinel/frontend/src/components/reports/pdf/Letterhead.tsx` (from Agent D1)
- `/home/sauk/projects/sentinel/backend/src/services/member-service.ts` (existing)

**Dependencies**: MUST wait for Agent C1 + D1 completion

**Task**:
Implement Personnel Status Roster report with sorting options.

**Specific Deliverables**:
1. Component: `frontend/src/components/reports/PersonnelRoster.tsx`
   - Filters: Division dropdown, Sort order dropdown (Division/Rank/Alphabetical)
   - Data table preview
   - Export button: "Download PDF"

2. Component: `frontend/src/components/reports/pdf/PersonnelRosterPDF.tsx`
   - Uses Letterhead wrapper
   - Table: Service #, Rank, Name, Division, Classification, Enrollment Date
   - Optional columns based on report settings (contact info)
   - Sorted according to selected sort order

3. Add to Reports page: New tab "Personnel Roster"

**Constraints**:
- Only include active members (status = 'active')
- Respect "Show service number" setting
- Date format from report settings

---

### Agent E4: Visitor Activity Summary
**Type**: `junior-engineer`
**Context Files**:
- `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- `/home/sauk/projects/sentinel/frontend/src/components/reports/pdf/Letterhead.tsx` (from Agent D1)
- `/home/sauk/projects/sentinel/backend/src/services/visitor-service.ts` (existing)

**Dependencies**: MUST wait for Agent C1 + D1 completion

**Task**:
Implement Visitor Activity Summary report with aggregation stats.

**Specific Deliverables**:
1. Component: `frontend/src/components/reports/VisitorSummary.tsx`
   - Filters: Date range picker, Visit type dropdown, Organization filter
   - Data table preview
   - Summary statistics: Total visitors, Average duration, By type/organization
   - Export buttons: "Download PDF" | "Export CSV"

2. Component: `frontend/src/components/reports/pdf/VisitorSummaryPDF.tsx`
   - Uses Letterhead wrapper
   - Summary section: Stats by type/organization
   - Detail table: Visitor name, Organization, Visit type, Purpose, Host, Check-in/out times, Duration
   - Date range in header

3. Enhance existing Visitor History tab: Add "Export PDF" button

**Constraints**:
- Calculate duration from check-in/check-out times
- Handle visitors still checked in (no check-out time) - show "In Progress"
- Group stats by visit type and organization

---

### Agent E5: Daily Check-In Summary
**Type**: `junior-engineer`
**Context Files**:
- `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- `/home/sauk/projects/sentinel/frontend/src/components/reports/pdf/Letterhead.tsx` (from Agent D1)

**Dependencies**: MUST wait for Agent C1 + D1 completion

**Task**:
Implement Daily Check-In Summary report (current presence).

**Specific Deliverables**:
1. Component: `frontend/src/components/reports/DailyCheckInSummary.tsx`
   - Filters: Division dropdown, Classification filter (FT Staff/Reserve/All)
   - Data table preview (current presence)
   - Export button: "Download PDF"

2. Component: `frontend/src/components/reports/pdf/DailyCheckInPDF.tsx`
   - Uses Letterhead wrapper
   - Summary section: Total present, By division, By classification
   - Present members table: Service #, Rank, Name, Division, Classification, Check-in time
   - Absent FT staff list (if any)
   - Generated timestamp in header

3. Enhance existing Current Presence tab: Add "Export PDF" button

**Constraints**:
- Real-time data (current check-ins today)
- FT staff: show as "Absent" if not checked in by working hours end
- Timestamp should reflect "as of" time

---

## Integration Points & Handoffs

### A1 → B1 Handoff
**Data Contract**:
- Types exported from `shared/types/index.ts`
- Service methods signature documentation
- Database schema available in migration file

**Verification**:
- Agent B1 should confirm service methods are working via unit tests
- Run migration and seed data before starting API work

---

### B1 → C1 Handoff
**Data Contract**:
- API routes documented with request/response schemas
- Zod schemas available for frontend validation
- Example API responses in route comments

**Verification**:
- Agent C1 should test API routes with `curl` or Postman
- Verify authentication middleware working

---

### C1 + D1 → E1-E5 Handoff
**Data Contract**:
- Settings API fully functional
- PDF components accept standard props (documented in component comments)
- Letterhead and PDFTable usage examples in SamplePDF.tsx

**Verification**:
- Agents E1-E5 should be able to render test PDFs before implementing logic
- Settings should be retrievable from API

---

## Build Validation Checkpoints

### After Group 0 (Database)
```bash
cd /home/sauk/projects/sentinel/backend
bun run db/migrate.ts
bun run tsc --noEmit
```

### After Group 1 (Backend API)
```bash
cd /home/sauk/projects/sentinel/backend
bun run tsc --noEmit
bun run dev  # Verify routes are mounted
```

### After Group 2 (Frontend + PDF)
```bash
cd /home/sauk/projects/sentinel/frontend
bun install  # For @react-pdf/renderer
bun run tsc --noEmit
bun run build
```

### After Group 3 (Reports)
```bash
cd /home/sauk/projects/sentinel/frontend
bun run tsc --noEmit
bun run build
bun run test  # Run attendance calculator unit tests
```

---

## Risk Mitigation

### Risk: PDF rendering performance on large datasets
**Mitigation**:
- Implement pagination in PDF reports (max 50 members per page)
- Add "Generating PDF..." loading indicator
- Test with 100+ member dataset

### Risk: Attendance calculation complexity
**Mitigation**:
- Write unit tests FIRST for edge cases
- Validate with real data before PDF generation
- Add debug logging for calculation steps

### Risk: Settings validation errors
**Mitigation**:
- Use Zod schemas on both frontend and backend
- Show clear error messages for invalid settings
- Provide default values for all settings

### Risk: BMQ enrollment conflicts
**Mitigation**:
- Database constraint: UNIQUE(member_id, bmq_course_id)
- API should return 409 Conflict if enrollment exists
- Frontend should disable "Enroll" button if already enrolled

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All migrations run without errors
- ✅ Settings API returns data
- ✅ Frontend settings UI saves successfully
- ✅ Sample PDF renders with letterhead

### Phase 2 Complete When:
- ✅ All 5 report types generate PDFs
- ✅ Attendance calculations match requirements spec
- ✅ Threshold flags display correctly
- ✅ Build passes without type errors
- ✅ Print stylesheets work in browser

### Integration Test Scenarios:
1. Create training year with holidays → Generate Training Night report → Verify holidays excluded
2. Enroll member in BMQ → Generate BMQ report → Verify member appears
3. Change report thresholds → Generate report → Verify flags change colors
4. New member (< grace period) → Generate report → Verify "New" badge shows

---

## Estimated Timeline

| Phase | Work Stream | Duration | Dependencies |
|-------|-------------|----------|--------------|
| 0 | Stream A (Database) | 2-3 hours | None |
| 1A | Stream B (Backend API) | 2-3 hours | Phase 0 |
| 1B | Stream C (Frontend UI) | 3-4 hours | Phase 1A |
| 1C | Stream D (PDF System) | 2-3 hours | Phase 0 |
| 2 | E1-E5 (Reports) | 5-10 hours | Phase 1B + 1C |

**Total Estimated Time**: 14-23 hours (developer time, not wall-clock time with parallelization)

**With Parallel Execution**: 8-12 hours (wall-clock time)

---

## Post-Implementation Tasks

After all agents complete:

1. **Orchestrator validation**:
   - Run full build: `cd frontend && bun run build`
   - Run type checking: `cd frontend && bun run tsc --noEmit`
   - Verify all migrations applied

2. **Manual testing checklist**:
   - Generate each report type
   - Test all filter combinations
   - Verify PDF letterhead appears correctly
   - Test browser print functionality
   - Verify threshold flags change colors

3. **Documentation updates**:
   - Update `docs/REMAINING-TASKS.md` to mark Enhanced Reports complete
   - Add API route documentation to backend README
   - Add screenshot of Settings page to docs

4. **Optional follow-ups** (Phase 3 - not in current scope):
   - Email delivery integration
   - Scheduled reports
   - BullMQ job processing

---

## Notes for Orchestrator

- **DO NOT** spawn all agents at once - respect dependencies
- **WAIT** for each phase to complete before starting next
- **VALIDATE** build after each phase
- **MONITOR** for blockers and resolve before proceeding
- **AGGREGATE** results and report to user with file paths
