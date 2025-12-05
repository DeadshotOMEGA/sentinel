# Enhanced Reports System - Implementation Plan

**Status**: Ready for Implementation
**Created**: 2024-12-04
**Phase**: Foundation (Phase 1) + Report Types & BMQ (Phase 2)

---

## Overview

This plan implements professional PDF reporting for HMCS Chippawa with five report types, configurable settings, training year management, and BMQ course tracking. Phase 1 establishes foundation (PDF templates, settings infrastructure). Phase 2 delivers all report types and BMQ features.

**Related Documentation**:
- Requirements: `/home/sauk/projects/sentinel/docs/features/enhanced-reports/requirements.md`
- YAML Plan: `/home/sauk/projects/sentinel/docs/features/enhanced-reports/implementation-plan.yaml`

---

## Architecture Decisions

### PDF Generation Strategy
**Decision**: Client-side PDF generation using `@react-pdf/renderer`

**Rationale**:
- Declarative React components match existing frontend patterns
- Type-safe with TypeScript support
- No server-side headless browser overhead
- Suitable for Phase 1/2 (manual generation only)
- Backend generates structured JSON data, frontend renders PDF

**Trade-offs**:
- Phase 3 (scheduled reports) will require server-side rendering
- Large reports may impact browser performance (mitigated by streaming)

### Settings Storage
**Decision**: PostgreSQL JSONB in `report_settings` table (key-value pairs)

**Rationale**:
- Flexible schema for diverse setting types
- Single table simplifies queries and caching
- JSONB validation at application layer (Zod schemas)
- Atomic updates with optimistic locking via `updated_at`

**Alternative Considered**: Separate tables per settings category (rejected: over-engineering for ~20 settings)

### Training Year Management
**Decision**: Dedicated `training_years` table with `is_current` flag and trigger

**Rationale**:
- Historical training year data needed for reports spanning multiple years
- Holiday exclusions as JSONB array for flexibility
- Trigger ensures exactly one current training year at all times
- Supports "compare to previous year" trend calculations

---

## Database Schema

### Migration 010: Training Years

```sql
CREATE TABLE training_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,                    -- e.g., "2024-2025"
  start_date DATE NOT NULL,                      -- September 1
  end_date DATE NOT NULL,                        -- May 31
  holiday_exclusions JSONB DEFAULT '[]',         -- [{start, end, name}]
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_years_dates ON training_years(start_date, end_date);
CREATE INDEX idx_training_years_current ON training_years(is_current);

-- Trigger: Only one training year can be current
CREATE OR REPLACE FUNCTION ensure_single_current_training_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE training_years SET is_current = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_year_current_check
  BEFORE INSERT OR UPDATE ON training_years
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_current_training_year();
```

**Holiday Exclusions Format**:
```json
[
  {"start": "2024-12-20", "end": "2024-12-27", "name": "Christmas Break"},
  {"start": "2025-02-17", "end": "2025-02-21", "name": "Mid-Winter Break"}
]
```

### Migration 011: BMQ Courses

```sql
CREATE TABLE bmq_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,                    -- e.g., "Fall 2024 BMQ"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  training_day VARCHAR(10) NOT NULL,             -- e.g., "saturday"
  training_start_time TIME NOT NULL,             -- e.g., "08:00"
  training_end_time TIME NOT NULL,               -- e.g., "16:00"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bmq_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  bmq_course_id UUID NOT NULL REFERENCES bmq_courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'enrolled'
    CHECK (status IN ('enrolled', 'completed', 'withdrawn')),
  UNIQUE(member_id, bmq_course_id)
);

CREATE INDEX idx_bmq_courses_active ON bmq_courses(is_active);
CREATE INDEX idx_bmq_enrollments_member ON bmq_enrollments(member_id);
CREATE INDEX idx_bmq_enrollments_course ON bmq_enrollments(bmq_course_id);
CREATE INDEX idx_bmq_enrollments_status ON bmq_enrollments(status);
```

### Migration 012: Report Settings

```sql
CREATE TABLE report_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_report_settings_updated_at
  BEFORE UPDATE ON report_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO report_settings (key, value) VALUES
  ('schedule.training_night_day', '"tuesday"'),
  ('schedule.training_night_start', '"19:00"'),
  ('schedule.training_night_end', '"22:10"'),
  ('schedule.admin_night_day', '"thursday"'),
  ('schedule.admin_night_start', '"19:00"'),
  ('schedule.admin_night_end', '"22:10"'),

  ('working_hours.regular_weekday_start', '"08:00"'),
  ('working_hours.regular_weekday_end', '"16:00"'),
  ('working_hours.regular_weekdays', '["monday", "wednesday", "friday"]'),
  ('working_hours.summer_start_date', '"2025-06-01"'),
  ('working_hours.summer_end_date', '"2025-08-31"'),
  ('working_hours.summer_weekday_start', '"09:00"'),
  ('working_hours.summer_weekday_end', '"15:00"'),

  ('thresholds.warning_threshold', '75'),
  ('thresholds.critical_threshold', '50'),
  ('thresholds.show_threshold_flags', 'true'),
  ('thresholds.bmq_separate_thresholds', 'false'),
  ('thresholds.bmq_warning_threshold', '80'),
  ('thresholds.bmq_critical_threshold', '60'),

  ('member_handling.new_member_grace_period', '4'),
  ('member_handling.minimum_training_nights', '3'),
  ('member_handling.include_ft_staff', 'true'),
  ('member_handling.show_bmq_badge', 'true'),
  ('member_handling.show_trend_indicators', 'true'),

  ('formatting.default_sort_order', '"division_rank"'),
  ('formatting.show_service_number', 'true'),
  ('formatting.date_format', '"DD MMM YYYY"'),
  ('formatting.page_size', '"letter"');
```

### Migration 013: Report Audit Log

```sql
CREATE TABLE report_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL,              -- e.g., 'training_night_attendance'
  report_config JSONB NOT NULL,                  -- Filters/parameters used
  generated_by UUID REFERENCES admin_users(id),  -- NULL for scheduled (Phase 3)
  is_scheduled BOOLEAN DEFAULT false,
  scheduled_report_id UUID,                      -- For Phase 3
  generated_at TIMESTAMP DEFAULT NOW(),
  file_size_bytes INTEGER,
  generation_time_ms INTEGER
);

CREATE INDEX idx_report_audit_type ON report_audit_log(report_type);
CREATE INDEX idx_report_audit_user ON report_audit_log(generated_by);
CREATE INDEX idx_report_audit_generated ON report_audit_log(generated_at DESC);
CREATE INDEX idx_report_audit_scheduled ON report_audit_log(is_scheduled);

COMMENT ON TABLE report_audit_log IS 'Audit trail for all report generation events';
```

---

## Shared Types

### `/shared/types/reports.ts`

```typescript
export interface TrainingYear {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  holidayExclusions: Array<{
    start: Date;
    end: Date;
    name: string;
  }>;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BMQCourse {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  trainingDay: string;
  trainingStartTime: string;
  trainingEndTime: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BMQEnrollment {
  id: string;
  memberId: string;
  bmqCourseId: string;
  enrolledAt: Date;
  completedAt?: Date;
  status: 'enrolled' | 'completed' | 'withdrawn';
}

export interface ReportSettings {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export type ReportType =
  | 'daily_checkin'
  | 'training_night_attendance'
  | 'bmq_attendance'
  | 'personnel_roster'
  | 'visitor_summary';

export interface AttendanceCalculation {
  status: 'new' | 'insufficient_data' | 'calculated';
  percentage?: number;
  attended?: number;
  possible?: number;
  flag?: 'none' | 'warning' | 'critical';
  badge?: string;
  display?: string;
}

export interface TrendIndicator {
  trend: 'up' | 'down' | 'stable' | 'none';
  delta?: number;
}

export interface TrainingNightReportConfig {
  periodStart: Date;
  periodEnd: Date;
  organizationOption: 'full_unit' | 'grouped_division' | 'separated_division' | 'specific_division' | 'specific_member';
  divisionId?: string;
  memberId?: string;
  includeFTStaff: boolean;
  showBMQBadge: boolean;
}

export interface ReportAuditLog {
  id: string;
  reportType: ReportType;
  reportConfig: Record<string, unknown>;
  generatedBy?: string;
  isScheduled: boolean;
  scheduledReportId?: string;
  generatedAt: Date;
  fileSizeBytes?: number;
  generationTimeMs?: number;
}
```

### `/shared/types/settings.ts`

```typescript
export interface ScheduleSettings {
  trainingNightDay: string;
  trainingNightStart: string;
  trainingNightEnd: string;
  adminNightDay: string;
  adminNightStart: string;
  adminNightEnd: string;
}

export interface WorkingHoursSettings {
  regularWeekdayStart: string;
  regularWeekdayEnd: string;
  regularWeekdays: string[];
  summerStartDate: string;
  summerEndDate: string;
  summerWeekdayStart: string;
  summerWeekdayEnd: string;
}

export interface ThresholdSettings {
  warningThreshold: number;
  criticalThreshold: number;
  showThresholdFlags: boolean;
  bmqSeparateThresholds: boolean;
  bmqWarningThreshold: number;
  bmqCriticalThreshold: number;
}

export interface MemberHandlingSettings {
  newMemberGracePeriod: number;
  minimumTrainingNights: number;
  includeFTStaff: boolean;
  showBMQBadge: boolean;
  showTrendIndicators: boolean;
}

export interface FormattingSettings {
  defaultSortOrder: 'division_rank' | 'rank' | 'alphabetical';
  showServiceNumber: boolean;
  dateFormat: 'DD MMM YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
  pageSize: 'letter' | 'a4';
}
```

---

## Backend Services

### Attendance Calculator

**File**: `/backend/src/services/attendance-calculator.ts`

```typescript
import type { AttendanceCalculation, TrendIndicator } from '@shared/types/reports';
import type { ThresholdSettings, MemberHandlingSettings } from '@shared/types/settings';

export async function calculateTrainingNightAttendance(
  memberId: string,
  periodStart: Date,
  periodEnd: Date,
  settings: ThresholdSettings,
  memberHandling: MemberHandlingSettings
): Promise<AttendanceCalculation> {
  // 1. Get member join date
  // 2. Effective start = max(periodStart, joinDate)
  // 3. Get all training nights in range (excluding holidays)
  // 4. Get member's check-ins during training night hours
  // 5. Apply grace period logic
  // 6. Apply minimum nights logic
  // 7. Calculate percentage and threshold flag
}

export function getTrainingNights(
  startDate: Date,
  endDate: Date,
  trainingDay: string,
  holidayExclusions: Array<{start: Date, end: Date}>
): Date[] {
  // Generate all occurrences of trainingDay between dates
  // Filter out dates that fall within holiday exclusion ranges
}

export async function getTrainingNightCheckins(
  memberId: string,
  startDate: Date,
  endDate: Date,
  trainingNightStart: string,
  trainingNightEnd: string
): Promise<CheckIn[]> {
  // Query checkins table for member
  // Filter to training night hours on training days
}

export async function calculateTrend(
  memberId: string,
  currentPeriod: {start: Date, end: Date},
  previousPeriod: {start: Date, end: Date}
): Promise<TrendIndicator> {
  // Calculate attendance for both periods
  // Compare percentages
  // Return 'up' if delta > 2%, 'down' if < -2%, else 'stable'
}

export function getThresholdFlag(
  percentage: number,
  settings: ThresholdSettings,
  isBMQ: boolean
): 'none' | 'warning' | 'critical' {
  const warning = isBMQ && settings.bmqSeparateThresholds
    ? settings.bmqWarningThreshold
    : settings.warningThreshold;
  const critical = isBMQ && settings.bmqSeparateThresholds
    ? settings.bmqCriticalThreshold
    : settings.criticalThreshold;

  if (percentage <= critical) return 'critical';
  if (percentage <= warning) return 'warning';
  return 'none';
}
```

---

## Backend API Routes

### Training Years Routes

**File**: `/backend/src/routes/training-years.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../db/prisma';

const router = Router();

const createTrainingYearSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  holidayExclusions: z.array(z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    name: z.string()
  })).default([])
});

router.get('/', requireAuth, async (req, res) => {
  // Fetch all training years ordered by start_date DESC
});

router.get('/current', requireAuth, async (req, res) => {
  // Fetch training year where is_current = true
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  // Validate with createTrainingYearSchema
  // Insert new training year
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  // Update training year by id
});

router.put('/:id/set-current', requireAuth, requireRole('admin'), async (req, res) => {
  // Set is_current = true for this id (trigger handles others)
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  // Delete if not current
});

export { router as trainingYearRoutes };
```

### BMQ Courses Routes

**File**: `/backend/src/routes/bmq-courses.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const createBMQCourseSchema = z.object({
  name: z.string().min(1).max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  trainingDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  trainingStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  trainingEndTime: z.string().regex(/^\d{2}:\d{2}$/)
});

router.get('/', requireAuth, async (req, res) => {
  // Optional ?active=true filter
});

router.get('/:id', requireAuth, async (req, res) => {
  // Fetch course with enrollment count
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  // Create BMQ course
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  // Update course
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  // Delete course (cascade enrollments)
});

router.get('/:id/enrollments', requireAuth, async (req, res) => {
  // Fetch enrollments with member details
});

router.post('/:courseId/enrollments', requireAuth, requireRole('admin'), async (req, res) => {
  // Enroll member in course (body: {memberId})
});

router.put('/enrollments/:id', requireAuth, requireRole('admin'), async (req, res) => {
  // Update enrollment status
});

router.delete('/enrollments/:id', requireAuth, requireRole('admin'), async (req, res) => {
  // Remove enrollment
});

export { router as bmqCourseRoutes };
```

### Report Settings Routes

**File**: `/backend/src/routes/report-settings.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Validation schemas for each settings category
const scheduleSchema = z.object({
  trainingNightDay: z.string(),
  trainingNightStart: z.string(),
  trainingNightEnd: z.string(),
  adminNightDay: z.string(),
  adminNightStart: z.string(),
  adminNightEnd: z.string()
});

const thresholdSchema = z.object({
  warningThreshold: z.number().min(0).max(100),
  criticalThreshold: z.number().min(0).max(100),
  showThresholdFlags: z.boolean(),
  bmqSeparateThresholds: z.boolean(),
  bmqWarningThreshold: z.number().min(0).max(100),
  bmqCriticalThreshold: z.number().min(0).max(100)
});

router.get('/', requireAuth, async (req, res) => {
  // Fetch all settings as key-value map
});

router.get('/:key', requireAuth, async (req, res) => {
  // Fetch specific setting
});

router.put('/:key', requireAuth, requireRole('admin'), async (req, res) => {
  // Update single setting with validation
});

router.put('/bulk', requireAuth, requireRole('admin'), async (req, res) => {
  // Batch update multiple settings
});

export { router as reportSettingsRoutes };
```

### Reports Routes

**File**: `/backend/src/routes/reports.ts`

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { calculateTrainingNightAttendance } from '../services/attendance-calculator';

const router = Router();

router.post('/daily-checkin', requireAuth, async (req, res) => {
  const startTime = Date.now();

  // 1. Fetch current presence data
  // 2. Group by division, member type
  // 3. Generate summary stats

  const data = { /* ... */ };

  // Log to audit table
  await logReportGeneration({
    reportType: 'daily_checkin',
    config: req.body,
    generatedBy: req.user.id,
    generationTimeMs: Date.now() - startTime
  });

  res.json(data);
});

router.post('/training-night-attendance', requireAuth, async (req, res) => {
  const { periodStart, periodEnd, organizationOption, divisionId, memberId } = req.body;

  // 1. Fetch report settings
  // 2. Fetch training year holiday exclusions
  // 3. Query members based on filters
  // 4. For each member, call calculateTrainingNightAttendance()
  // 5. Calculate trends
  // 6. Organize by organization option

  const data = { /* members with attendance calculations */ };

  await logReportGeneration({ /* ... */ });

  res.json(data);
});

router.post('/bmq-attendance', requireAuth, async (req, res) => {
  // Similar to training-night-attendance but for BMQ courses
});

router.post('/personnel-roster', requireAuth, async (req, res) => {
  // Fetch active members with division details
  // Sort by requested order
});

router.post('/visitor-summary', requireAuth, async (req, res) => {
  // Fetch visitors in date range
  // Generate summary statistics
});

export { router as reportRoutes };
```

---

## Frontend Components

### PDF Letterhead

**File**: `/frontend/src/components/reports/PDFLetterhead.tsx`

```tsx
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica'
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottom: '2pt solid #000'
  },
  crest: {
    width: 60,
    height: 60,
    marginRight: 15
  },
  headerText: {
    flex: 1
  },
  unitName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  address: {
    fontSize: 10,
    color: '#555'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1pt solid #ccc',
    paddingTop: 10
  },
  footerText: {
    fontSize: 8,
    color: '#666'
  }
});

interface PDFLetterheadProps {
  reportTitle: string;
  generatedAt: Date;
  classification?: string;
  children: React.ReactNode;
}

export function PDFLetterhead({ reportTitle, generatedAt, classification = 'UNCLASSIFIED', children }: PDFLetterheadProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Image
            src="/images/hmcs_chippawa_crest.jpg"
            style={styles.crest}
          />
          <View style={styles.headerText}>
            <Text style={styles.unitName}>HMCS CHIPPAWA</Text>
            <Text style={styles.address}>1 Navy Way, Winnipeg, MB</Text>
            <Text style={styles.address}>Phone: (204) 555-0100</Text>
          </View>
        </View>

        {children}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{reportTitle}</Text>
          <Text style={styles.footerText}>
            Generated: {generatedAt.toLocaleString('en-CA')}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
          <Text style={styles.footerText}>{classification}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

### Training Night Attendance PDF

**File**: `/frontend/src/components/reports/TrainingNightAttendancePDF.tsx`

```tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDFLetterhead } from './PDFLetterhead';

const styles = StyleSheet.create({
  table: {
    marginTop: 20
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ddd',
    paddingVertical: 8
  },
  headerRow: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    fontSize: 10
  },
  cell: {
    fontSize: 9,
    paddingHorizontal: 4
  },
  flag: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 4
  },
  flagGreen: { backgroundColor: '#10b981' },
  flagYellow: { backgroundColor: '#fbbf24' },
  flagRed: { backgroundColor: '#ef4444' },
  trend: {
    fontSize: 10,
    marginLeft: 4
  }
});

interface TrainingNightAttendancePDFProps {
  data: {
    members: Array<{
      rank: string;
      name: string;
      division: string;
      attended: number;
      possible: number;
      percentage: number;
      flag: 'none' | 'warning' | 'critical';
      trend: { trend: string; delta: number };
      isNew: boolean;
      isBMQ: boolean;
    }>;
    periodStart: Date;
    periodEnd: Date;
  };
}

export function TrainingNightAttendancePDF({ data }: TrainingNightAttendancePDFProps) {
  return (
    <PDFLetterhead
      reportTitle="Training Night Attendance Report"
      generatedAt={new Date()}
    >
      <View>
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
          Training Night Attendance Report
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 20 }}>
          Period: {data.periodStart.toLocaleDateString()} - {data.periodEnd.toLocaleDateString()}
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.headerRow]}>
            <Text style={[styles.cell, { width: '10%' }]}>Rank</Text>
            <Text style={[styles.cell, { width: '25%' }]}>Name</Text>
            <Text style={[styles.cell, { width: '15%' }]}>Division</Text>
            <Text style={[styles.cell, { width: '15%' }]}>Attended</Text>
            <Text style={[styles.cell, { width: '10%' }]}>%</Text>
            <Text style={[styles.cell, { width: '10%' }]}>Flag</Text>
            <Text style={[styles.cell, { width: '15%' }]}>Trend</Text>
          </View>

          {data.members.map((member, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.cell, { width: '10%' }]}>{member.rank}</Text>
              <Text style={[styles.cell, { width: '25%' }]}>
                {member.name}
                {member.isNew && ' [NEW]'}
                {member.isBMQ && ' [BMQ]'}
              </Text>
              <Text style={[styles.cell, { width: '15%' }]}>{member.division}</Text>
              <Text style={[styles.cell, { width: '15%' }]}>
                {member.attended}/{member.possible}
              </Text>
              <Text style={[styles.cell, { width: '10%' }]}>
                {member.percentage.toFixed(0)}%
              </Text>
              <View style={[styles.cell, { width: '10%' }]}>
                {member.flag !== 'none' && (
                  <View style={[
                    styles.flag,
                    member.flag === 'warning' ? styles.flagYellow : styles.flagRed
                  ]} />
                )}
              </View>
              <Text style={[styles.cell, { width: '15%' }]}>
                {member.trend.trend === 'up' && '↑'}
                {member.trend.trend === 'down' && '↓'}
                {member.trend.trend === 'stable' && '→'}
                {member.trend.delta > 0 && ` +${member.trend.delta.toFixed(0)}%`}
                {member.trend.delta < 0 && ` ${member.trend.delta.toFixed(0)}%`}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </PDFLetterhead>
  );
}
```

### Reports Page Updates

**File**: `/frontend/src/pages/Reports.tsx` (modifications)

```tsx
import { useState } from 'react';
import { Tabs, Tab, Button, Select, SelectItem, RadioGroup, Radio } from '@heroui/react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { TrainingNightAttendancePDF } from '../components/reports/TrainingNightAttendancePDF';
import { api } from '../lib/api';

export default function Reports() {
  const [tab, setTab] = useState('presence');

  return (
    <PageWrapper title="Reports">
      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
        <Tab key="presence" title="Current Presence" />
        <Tab key="training-night" title="Training Night Attendance" />
        <Tab key="bmq" title="BMQ Attendance" />
        <Tab key="roster" title="Personnel Roster" />
        <Tab key="visitors" title="Visitor History" />
      </Tabs>

      <div className="mt-6">
        {tab === 'training-night' && <TrainingNightAttendanceTab />}
        {/* Other tabs... */}
      </div>
    </PageWrapper>
  );
}

function TrainingNightAttendanceTab() {
  const [period, setPeriod] = useState('current');
  const [organization, setOrganization] = useState('full_unit');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      // Fetch report data from backend
      const response = await api.post('/reports/training-night-attendance', {
        period,
        organizationOption: organization
      });

      // Render PDF component to blob
      const blob = await pdf(
        <TrainingNightAttendancePDF data={response.data} />
      ).toBlob();

      // Download
      const filename = `training-night-attendance-${new Date().toISOString().split('T')[0]}.pdf`;
      saveAs(blob, filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      // Show error toast
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 space-y-4">
        <Select label="Period" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <SelectItem key="current" value="current">Current Training Year</SelectItem>
          <SelectItem key="previous" value="previous">Previous Training Year</SelectItem>
          <SelectItem key="last-30" value="last-30">Last 30 Days</SelectItem>
        </Select>

        <RadioGroup label="Organization" value={organization} onValueChange={setOrganization}>
          <Radio value="full_unit">Full Unit Report</Radio>
          <Radio value="grouped_division">Grouped by Division</Radio>
          <Radio value="separated_division">Separated by Division</Radio>
        </RadioGroup>
      </div>

      <Button
        color="primary"
        onPress={handleGeneratePDF}
        isLoading={isGenerating}
      >
        Generate PDF
      </Button>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

**Backend Services**:
- `attendance-calculator.test.ts`:
  - Test `getTrainingNights()` excludes holidays correctly
  - Test `calculateTrainingNightAttendance()` handles new members (grace period)
  - Test `calculateTrainingNightAttendance()` handles minimum nights threshold
  - Test `getThresholdFlag()` applies correct flags
  - Test `calculateTrend()` computes deltas correctly

**Backend Routes**:
- `training-years.test.ts`:
  - Test POST creates training year
  - Test PUT /:id/set-current updates is_current flag
  - Test DELETE fails for current training year
- `bmq-courses.test.ts`:
  - Test enrollment unique constraint (member_id, course_id)
  - Test cascade delete of enrollments
- `report-settings.test.ts`:
  - Test validation for each settings category schema

### Integration Tests

**API Endpoints**:
- Test `/api/reports/training-night-attendance` with various filters
- Test audit log records generation correctly
- Test settings update triggers report recalculation

### E2E Tests (Playwright)

**Report Generation Flow**:
1. Admin logs in
2. Navigates to Reports > Training Night Attendance
3. Selects period "Current Training Year"
4. Clicks "Generate PDF"
5. Verify PDF downloads with correct filename
6. Verify audit log entry created

**Settings Management Flow**:
1. Admin navigates to Settings > Training Year
2. Creates new training year
3. Sets as current
4. Adds holiday exclusion
5. Verifies training night attendance report respects exclusions

---

## Dependencies

### Backend
```json
{
  "dependencies": {
    "date-fns": "^3.0.0"
  }
}
```
*Note: All other dependencies already exist (Prisma, Zod, Express, etc.)*

### Frontend
```json
{
  "dependencies": {
    "@react-pdf/renderer": "^3.1.14",
    "@react-pdf/types": "^2.3.7",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.5"
  }
}
```

**Installation**:
```bash
cd /home/sauk/projects/sentinel/frontend
bun add @react-pdf/renderer @react-pdf/types file-saver
bun add -d @types/file-saver
```

---

## Rollout Plan

### Phase 1: Foundation (Week 1)

**Day 1-2**: Database & Types
- Run migrations 010-013
- Create shared types (reports.ts, settings.ts)
- Verify migrations applied correctly

**Day 3-4**: Backend Services & Routes
- Implement attendance-calculator.ts
- Implement training-years routes
- Implement bmq-courses routes
- Implement report-settings routes
- Write unit tests for services

**Day 5**: PDF Infrastructure
- Install frontend dependencies
- Create PDFLetterhead component
- Test PDF rendering in isolation

### Phase 2: Report Types & BMQ (Week 2)

**Day 1-2**: Backend Report Routes
- Implement reports routes (all five types)
- Integrate attendance calculator
- Add audit logging
- Test with Postman/curl

**Day 3-4**: Frontend PDF Components
- Create all five PDF components
- Test rendering with sample data
- Verify styling and layout

**Day 5**: UI Integration
- Update Reports page with new tabs
- Add filter controls
- Wire up "Generate PDF" buttons
- Test end-to-end flow

### Phase 3: Settings UI (Week 3)

**Day 1**: Training Year & Working Hours
- Create TrainingYearSettings component
- Create WorkingHoursSettings component
- Test CRUD operations

**Day 2**: Report Settings & BMQ Courses
- Create ReportSettingsForm component
- Create BMQCoursesSettings component
- Test settings persistence

**Day 3**: Member Profile BMQ Integration
- Add BMQ enrollment section to MemberDetail
- Test enrollment workflow

**Day 4-5**: Testing & Polish
- E2E tests for all report types
- E2E tests for settings management
- Fix bugs, improve error handling
- Performance testing (large reports)

---

## Acceptance Criteria

### Phase 1 Complete When:
- [ ] Admin can configure training year dates and holidays in Settings
- [ ] Admin can configure report thresholds and settings
- [ ] User can generate a professional PDF of current presence report
- [ ] PDF includes proper letterhead with HMCS Chippawa crest
- [ ] All database migrations applied successfully

### Phase 2 Complete When:
- [ ] Training Night Attendance report with all filters/organization options works
- [ ] BMQ courses can be created and managed in Settings
- [ ] Members can be enrolled in BMQ courses from their profile
- [ ] BMQ Attendance report generates correctly
- [ ] Personnel Roster PDF generates with sort options
- [ ] Visitor Summary PDF generates with filters
- [ ] Threshold flags display correctly (green/yellow/red)
- [ ] Trend indicators show for members with sufficient history
- [ ] New member grace period respected (no flags for new members)
- [ ] All report generation logged to audit table

---

## Known Limitations & Future Work

### Phase 3 (Not Included in This Plan)
- Email delivery of reports (requires Resend integration)
- Scheduled reports (requires BullMQ setup)
- Backend PDF generation for automation
- `scheduled_reports` table and job processing

### Performance Considerations
- Large reports (>500 members) may take 5-10 seconds to generate
- Consider pagination for very large rosters
- Client-side PDF rendering memory intensive (monitor browser performance)

### Accessibility
- PDF documents are not screen-reader accessible
- Consider adding HTML preview mode for accessibility compliance

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| PDF generation slow for large reports | Implement loading indicator, consider pagination, optimize queries |
| Attendance calculation bugs | Comprehensive unit tests with edge cases (holidays, new members, partial periods) |
| Settings validation errors | Zod schemas with clear error messages, frontend validation before submission |
| Audit log filling database | Add retention policy (Phase 3), index on generated_at for cleanup queries |
| Unit crest image not found | Bundle crest image in frontend public/ folder, fallback to text-only header |

---

## Success Metrics

- Report generation success rate > 99%
- Average PDF generation time < 3 seconds for reports with < 100 members
- Zero manual SQL queries needed for report data (all via API)
- Admin user satisfaction rating > 4/5 for report quality
- 100% audit coverage (all reports logged)

---

**End of Implementation Plan**
