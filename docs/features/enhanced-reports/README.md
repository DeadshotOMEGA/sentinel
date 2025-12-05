# Enhanced Reports System - Documentation Index

**Feature Status**: Ready for Implementation
**Phase**: Foundation (Phase 1) + Report Types & BMQ (Phase 2)
**Created**: 2024-12-04

---

## Documentation Structure

This directory contains all documentation for the Enhanced Reports feature implementation.

### Core Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| **[requirements.md](./requirements.md)** | Complete feature requirements, report types, settings, data model | Product/Tech Leads |
| **[implementation-plan.yaml](./implementation-plan.yaml)** | Structured YAML plan for agent execution (pdocs format) | Programmer Agents |
| **[implementation-plan.md](./implementation-plan.md)** | Detailed markdown plan with code examples, testing strategy | Human Developers |
| **[quick-reference.md](./quick-reference.md)** | Quick start guide, file checklist, API reference | All Developers |
| **[dependencies.md](./dependencies.md)** | Installation instructions, dependency versions | DevOps/Setup |

### Supporting Documents

| Document | Purpose |
|----------|---------|
| **[investigation.md](./investigation.md)** | Initial codebase investigation notes |
| **[orchestration-plan.md](./orchestration-plan.md)** | High-level orchestration strategy |

---

## Quick Start

### 1. Review Requirements
Start with [requirements.md](./requirements.md) to understand:
- Five report types (Daily Check-In, Training Night Attendance, BMQ Attendance, Personnel Roster, Visitor Summary)
- Settings categories (Training Year, Working Hours, Report Settings, BMQ Courses)
- Acceptance criteria and success metrics

### 2. Install Dependencies
Follow [dependencies.md](./dependencies.md):
```bash
cd /home/sauk/projects/sentinel/frontend
bun add @react-pdf/renderer @react-pdf/types file-saver
bun add -d @types/file-saver

cd /home/sauk/projects/sentinel/backend
bun add date-fns
```

### 3. Execute Implementation Plan
Follow task breakdown in [implementation-plan.yaml](./implementation-plan.yaml) or [implementation-plan.md](./implementation-plan.md):
- 18 tasks (T1-T18) with clear dependencies
- Database migrations → Types → Services → Routes → UI
- Each task specifies files to create/modify

### 4. Use Quick Reference During Development
Keep [quick-reference.md](./quick-reference.md) open for:
- API endpoint reference
- Settings keys lookup
- Common code patterns
- Troubleshooting tips

---

## Implementation Overview

### Phase 1: Foundation (Week 1)
**Goal**: PDF infrastructure, settings backend, training year management

**Key Deliverables**:
- 4 database migrations (training years, BMQ courses, report settings, audit log)
- Shared TypeScript types (reports, settings)
- Attendance calculation service
- Backend API routes (training years, BMQ courses, report settings)
- PDF letterhead component

**Entry Point**: Tasks T1-T10

### Phase 2: Report Types & BMQ (Week 2-3)
**Goal**: All five report types, BMQ features, settings UI

**Key Deliverables**:
- Reports backend routes (data generation)
- Five PDF components (Daily Check-In, Training Night, BMQ, Roster, Visitor)
- Settings UI (Training Year, Working Hours, Report Settings, BMQ Courses)
- Reports page updates (tabs, filters, PDF generation)
- Member profile BMQ enrollment section

**Entry Point**: Tasks T11-T18

---

## Architecture Highlights

### PDF Generation Strategy
- **Client-side**: `@react-pdf/renderer` for Phase 1/2 (manual generation)
- Backend generates structured JSON data
- Frontend renders React components to PDF
- Future (Phase 3): Server-side for scheduled reports

### Settings Storage
- PostgreSQL JSONB in `report_settings` table
- Key-value pairs for flexibility
- Zod validation at application layer
- ~30 settings across 5 categories

### Attendance Calculation
- Service layer computes percentages, flags, trends
- Training nights: Tuesday nights excluding holidays
- BMQ sessions: Course-specific day/time
- Thresholds: 75% warning, 50% critical (configurable)
- Special handling: new members (grace period), minimum nights threshold

---

## Database Schema Summary

| Table | Rows (Est.) | Purpose |
|-------|-------------|---------|
| `training_years` | ~10 | Training year definitions with holiday exclusions |
| `bmq_courses` | ~20 | BMQ course schedules |
| `bmq_enrollments` | ~100 | Member BMQ enrollments |
| `report_settings` | ~30 | Key-value configuration |
| `report_audit_log` | Growing | All report generation events |

**Total Storage Impact**: <5MB (excluding audit log)

---

## API Endpoints Summary

### New Routes (15 endpoints)
```
GET    /api/training-years
GET    /api/training-years/current
POST   /api/training-years
PUT    /api/training-years/:id
PUT    /api/training-years/:id/set-current
DELETE /api/training-years/:id

GET    /api/bmq-courses
GET    /api/bmq-courses/:id
POST   /api/bmq-courses
GET    /api/bmq-courses/:id/enrollments
POST   /api/bmq-courses/:courseId/enrollments

GET    /api/report-settings
PUT    /api/report-settings/:key
PUT    /api/report-settings/bulk

POST   /api/reports/daily-checkin
POST   /api/reports/training-night-attendance
POST   /api/reports/bmq-attendance
POST   /api/reports/personnel-roster
POST   /api/reports/visitor-summary
```

---

## File Inventory

### New Files (30)
**Backend**:
- 4 migration files
- 2 shared type files
- 2 service files
- 4 route files

**Frontend**:
- 6 PDF component files
- 4 settings component files

### Modified Files (3)
- `backend/src/routes/index.ts` - Mount new routes
- `frontend/src/pages/Settings.tsx` - Add settings tabs
- `frontend/src/pages/Reports.tsx` - Add report tabs
- `frontend/src/pages/MemberDetail.tsx` - Add BMQ enrollment section

### Configuration Files (1)
- `frontend/package.json` - Add dependencies

---

## Testing Strategy

### Unit Tests (Backend)
- Attendance calculator (6 test cases)
- Training years routes (4 test cases)
- BMQ courses routes (3 test cases)
- Report settings routes (3 test cases)

**Target**: 80% coverage for services, 60% for routes

### Integration Tests
- Report generation end-to-end (5 report types)
- Settings persistence and retrieval
- Audit log recording

**Target**: 100% coverage for critical paths

### E2E Tests (Playwright)
- Report generation flow (select filters → generate PDF → verify download)
- Settings management (create training year → add holidays → generate report respecting exclusions)
- BMQ enrollment workflow (enroll member → generate BMQ report)

**Target**: 3 critical flows covered

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Report generation success rate | >99% | Query `report_audit_log` for errors |
| Average PDF generation time | <3s (for <100 members) | `generation_time_ms` in audit log |
| Admin satisfaction | >4/5 | Post-implementation survey |
| Audit coverage | 100% | All reports logged in `report_audit_log` |

---

## Known Limitations

### Phase 3 Not Included
- Email delivery (requires Resend integration)
- Scheduled reports (requires BullMQ)
- Backend PDF generation for automation

### Performance
- Large reports (>500 members) may take 5-10 seconds
- Client-side rendering memory intensive

### Accessibility
- PDF documents not screen-reader accessible
- Consider HTML preview mode for WCAG compliance

---

## Related Documentation

- **Project Overview**: `/home/sauk/projects/sentinel/CLAUDE.md`
- **Database Schema**: `/home/sauk/projects/sentinel/backend/db/schema.sql`
- **Existing Reports Page**: `/home/sauk/projects/sentinel/frontend/src/pages/Reports.tsx`
- **Existing Settings Page**: `/home/sauk/projects/sentinel/frontend/src/pages/Settings.tsx`

---

## Contact & Questions

For questions about this implementation plan:
1. Review [quick-reference.md](./quick-reference.md) for common issues
2. Check [implementation-plan.md](./implementation-plan.md) for detailed specifications
3. Refer to [requirements.md](./requirements.md) for feature context

---

**Document Version**: 1.0
**Last Updated**: 2024-12-04
**Next Review**: After Phase 1 completion
