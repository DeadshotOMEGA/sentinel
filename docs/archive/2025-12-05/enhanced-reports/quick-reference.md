# Enhanced Reports - Quick Reference

**Implementation Plan**: `implementation-plan.md` | **Requirements**: `requirements.md` | **YAML Plan**: `implementation-plan.yaml`

---

## Quick Start Commands

### Run Migrations
```bash
cd /home/sauk/projects/sentinel/backend
bun run db/migrate.ts
```

### Install Dependencies
```bash
cd /home/sauk/projects/sentinel/frontend
bun add @react-pdf/renderer @react-pdf/types file-saver
bun add -d @types/file-saver
```

### Start Development
```bash
# Backend
cd /home/sauk/projects/sentinel/backend && bun run dev

# Frontend
cd /home/sauk/projects/sentinel/frontend && bun run dev
```

---

## Task Execution Order

**MUST complete in this order due to dependencies:**

1. **T1** - Database migrations (010-013)
2. **T2** - Shared types (reports.ts, settings.ts)
3. **T3** - Attendance calculator service
4. **T4** - Training years routes
5. **T5** - BMQ courses routes
6. **T6** - Report settings routes
7. **T7** - Reports routes
8. **T8** - Mount routes in index.ts
9. **T9** - Install frontend dependencies
10. **T10** - PDFLetterhead component
11. **T11** - All PDF components
12. **T12** - TrainingYearSettings
13. **T13** - WorkingHoursSettings
14. **T14** - ReportSettingsForm
15. **T15** - BMQCoursesSettings
16. **T16** - Update Settings page
17. **T17** - Update Reports page
18. **T18** - Update MemberDetail page

**Parallelization Opportunities**:
- T4, T5, T6 can run in parallel (all depend on T1, T2)
- T12, T13, T14, T15 can run in parallel (all depend on T2 and their respective backend routes)

---

## File Checklist

### Database Migrations
- [ ] `backend/db/migrations/010_training_years.sql`
- [ ] `backend/db/migrations/011_bmq_courses.sql`
- [ ] `backend/db/migrations/012_report_settings.sql`
- [ ] `backend/db/migrations/013_report_audit_log.sql`

### Shared Types
- [ ] `shared/types/reports.ts`
- [ ] `shared/types/settings.ts`

### Backend Services
- [ ] `backend/src/services/attendance-calculator.ts`
- [ ] `backend/src/services/bmq-attendance-calculator.ts`

### Backend Routes
- [ ] `backend/src/routes/training-years.ts`
- [ ] `backend/src/routes/bmq-courses.ts`
- [ ] `backend/src/routes/report-settings.ts`
- [ ] `backend/src/routes/reports.ts`
- [ ] `backend/src/routes/index.ts` (modify)

### Frontend Components - PDF
- [ ] `frontend/src/components/reports/PDFLetterhead.tsx`
- [ ] `frontend/src/components/reports/DailyCheckinPDF.tsx`
- [ ] `frontend/src/components/reports/TrainingNightAttendancePDF.tsx`
- [ ] `frontend/src/components/reports/BMQAttendancePDF.tsx`
- [ ] `frontend/src/components/reports/PersonnelRosterPDF.tsx`
- [ ] `frontend/src/components/reports/VisitorSummaryPDF.tsx`

### Frontend Components - Settings
- [ ] `frontend/src/components/settings/TrainingYearSettings.tsx`
- [ ] `frontend/src/components/settings/WorkingHoursSettings.tsx`
- [ ] `frontend/src/components/settings/ReportSettingsForm.tsx`
- [ ] `frontend/src/components/settings/BMQCoursesSettings.tsx`

### Frontend Pages
- [ ] `frontend/src/pages/Settings.tsx` (modify)
- [ ] `frontend/src/pages/Reports.tsx` (modify)
- [ ] `frontend/src/pages/MemberDetail.tsx` (modify)

### Package Files
- [ ] `frontend/package.json` (modify)

---

## Key API Endpoints

### Training Years
- `GET /api/training-years` - List all
- `GET /api/training-years/current` - Get current
- `POST /api/training-years` - Create
- `PUT /api/training-years/:id` - Update
- `PUT /api/training-years/:id/set-current` - Set as current
- `DELETE /api/training-years/:id` - Delete

### BMQ Courses
- `GET /api/bmq-courses?active=true` - List courses
- `POST /api/bmq-courses` - Create course
- `GET /api/bmq-courses/:id/enrollments` - List enrollments
- `POST /api/bmq-courses/:courseId/enrollments` - Enroll member
- `PUT /api/bmq-enrollments/:id` - Update enrollment

### Report Settings
- `GET /api/report-settings` - Get all settings
- `PUT /api/report-settings/:key` - Update single setting
- `PUT /api/report-settings/bulk` - Batch update

### Reports (Data Generation)
- `POST /api/reports/daily-checkin`
- `POST /api/reports/training-night-attendance`
- `POST /api/reports/bmq-attendance`
- `POST /api/reports/personnel-roster`
- `POST /api/reports/visitor-summary`

---

## Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `training_years` | Training year periods | name, start_date, end_date, holiday_exclusions, is_current |
| `bmq_courses` | BMQ course definitions | name, dates, training_day, times, is_active |
| `bmq_enrollments` | Member BMQ enrollments | member_id, bmq_course_id, status, enrolled_at |
| `report_settings` | Configuration key-values | key, value (JSONB), updated_at |
| `report_audit_log` | Report generation audit | report_type, config, generated_by, generated_at |

---

## Settings Keys Reference

### Schedule Settings
- `schedule.training_night_day` - "tuesday"
- `schedule.training_night_start` - "19:00"
- `schedule.training_night_end` - "22:10"
- `schedule.admin_night_day` - "thursday"
- `schedule.admin_night_start` - "19:00"
- `schedule.admin_night_end` - "22:10"

### Working Hours
- `working_hours.regular_weekday_start` - "08:00"
- `working_hours.regular_weekday_end` - "16:00"
- `working_hours.regular_weekdays` - ["monday", "wednesday", "friday"]
- `working_hours.summer_start_date` - "2025-06-01"
- `working_hours.summer_end_date` - "2025-08-31"
- `working_hours.summer_weekday_start` - "09:00"
- `working_hours.summer_weekday_end` - "15:00"

### Thresholds
- `thresholds.warning_threshold` - 75
- `thresholds.critical_threshold` - 50
- `thresholds.show_threshold_flags` - true
- `thresholds.bmq_separate_thresholds` - false
- `thresholds.bmq_warning_threshold` - 80
- `thresholds.bmq_critical_threshold` - 60

### Member Handling
- `member_handling.new_member_grace_period` - 4 (weeks)
- `member_handling.minimum_training_nights` - 3
- `member_handling.include_ft_staff` - true
- `member_handling.show_bmq_badge` - true
- `member_handling.show_trend_indicators` - true

### Formatting
- `formatting.default_sort_order` - "division_rank"
- `formatting.show_service_number` - true
- `formatting.date_format` - "DD MMM YYYY"
- `formatting.page_size` - "letter"

---

## Testing Commands

### Backend Tests
```bash
cd /home/sauk/projects/sentinel/backend
npx vitest run src/services/__tests__/attendance-calculator.test.ts
npx vitest run src/routes/__tests__/training-years.test.ts
npx vitest run src/routes/__tests__/bmq-courses.test.ts
```

### E2E Tests
```bash
cd /home/sauk/projects/sentinel
npx playwright test tests/e2e/reports.spec.ts
npx playwright test tests/e2e/settings-training-year.spec.ts
```

---

## Common Patterns

### Backend Route Pattern
```typescript
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const schema = z.object({
  // fields
});

router.get('/', requireAuth, async (req, res) => {
  // query database
  // return toCamelCase(rows)
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const validated = schema.parse(req.body);
  // insert to database
  // return created resource
});

export { router as someRoutes };
```

### Frontend Settings Component Pattern
```tsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Table } from '@heroui/react';
import { api } from '../lib/api';

export function SomeSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['some-resource'],
    queryFn: async () => {
      const response = await api.get('/api/some-resource');
      return response.data;
    }
  });

  const handleSave = async (formData) => {
    await api.post('/api/some-resource', formData);
    queryClient.invalidateQueries({ queryKey: ['some-resource'] });
    setIsModalOpen(false);
  };

  return (
    <>
      <Button onPress={() => setIsModalOpen(true)}>Add</Button>
      <Table>
        {/* table content */}
      </Table>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {/* form */}
      </Modal>
    </>
  );
}
```

### PDF Generation Pattern
```tsx
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { SomePDF } from '../components/reports/SomePDF';

async function handleGeneratePDF() {
  // 1. Fetch data from backend
  const response = await api.post('/api/reports/some-report', config);

  // 2. Render PDF to blob
  const blob = await pdf(<SomePDF data={response.data} />).toBlob();

  // 3. Trigger download
  const filename = `some-report-${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, filename);
}
```

---

## Troubleshooting

### Migration Fails
```bash
# Check current migration version
cd /home/sauk/projects/sentinel/backend
psql -d sentinel -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Manually rollback if needed (no automated rollback in this project)
# Edit migration file, then re-run
bun run db/migrate.ts
```

### PDF Not Rendering
- Check browser console for @react-pdf/renderer errors
- Verify image path for unit crest: `/home/sauk/projects/images/hmcs_chippawa_crest.jpg`
- Ensure image is accessible from frontend (copy to `frontend/public/images/` if needed)

### Attendance Calculation Incorrect
- Verify training year holiday exclusions are correct
- Check training night day setting matches expected day
- Confirm member enrollment date is set correctly
- Review attendance calculator unit tests for edge cases

### Settings Not Saving
- Check network tab for 400/500 errors
- Verify Zod schema matches settings structure
- Ensure admin role required for PUT endpoints
- Check backend logs for validation errors

---

## Resources

- **@react-pdf/renderer docs**: https://react-pdf.org/
- **HeroUI docs**: https://heroui.com/
- **Zod docs**: https://zod.dev/
- **Bun docs**: https://bun.sh/docs

---

**Last Updated**: 2024-12-04
