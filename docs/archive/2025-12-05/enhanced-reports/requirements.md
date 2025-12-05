# Enhanced Reports System - Requirements

> **Status**: Requirements Gathered
> **Created**: 2024-12-04
> **Last Updated**: 2024-12-04

## Overview

Extend the Sentinel reporting system beyond CSV exports to include professional PDF reports suitable for Command, automated report scheduling, and email delivery. Reports should be executive quality with official HMCS Chippawa branding.

## Current State

- Reports page exists with three tabs: Current Presence, Attendance History (placeholder), Visitor History
- CSV export available for Presence and Visitor History
- No PDF generation capability
- No scheduled/automated reports
- No email delivery

## Goals

1. **Professional PDF reports** with official letterhead for Command/Staff Officers
2. **Multiple report types** covering attendance, training nights, personnel, visitors, and BMQ
3. **Flexible delivery**: Download PDF, print from browser, email directly, scheduled automation
4. **Admin-configurable settings** for thresholds, formatting, and scheduling
5. **Training year awareness** with September-May cycle and holiday exclusions
6. **BMQ course tracking** for basic training students

---

## Report Types

### 1. Daily Check-In Summary
**Purpose**: Show who's present today
**Audience**: Duty personnel, Staff Officers

**Content**:
- Full-time staff present/absent
- Reserve members who checked in
- Summary statistics (total present, by division)
- Generated timestamp

**Filters**:
- Division
- Member classification (FT Staff, Reserve)

---

### 2. Training Night Attendance Report
**Purpose**: Track member attendance across Tuesday training nights
**Audience**: Command, Division heads, individual performance reviews

**Content**:
- Member-by-member attendance record
- Attendance percentage with threshold flags
- Trend indicators (improving/declining)
- Period covered

**Organization Options**:
- Full Unit Report (everyone together)
- Grouped by Division (single report, sections per division)
- Separated by Division (page break per division, or separate PDFs)
- Specific Division only
- Specific Member only

**Period Options**:
- Current training year (September - May)
- Previous training year
- Rolling periods (last 30/60/90 days, last N training nights)
- Custom date range

**Special Handling**:
- New members: Show "New" badge if joined within grace period
- Minimum attendance: Show "X of Y" instead of % if below minimum training nights
- Holiday exclusions: Don't count excluded dates against attendance
- BMQ students: Optional badge indicator, separate thresholds available

---

### 3. BMQ Attendance Report
**Purpose**: Track attendance for Basic Military Qualification course sessions
**Audience**: BMQ instructors, Training Officer

**Content**:
- BMQ student attendance to course sessions
- Attendance percentage with configurable thresholds
- Course name and date range

**Filters**:
- Specific BMQ course
- All active BMQ courses

**Organization Options**:
- Same as Training Night report (by division, individual, etc.)

---

### 4. Personnel Status Roster
**Purpose**: Current member roster for printing/posting
**Audience**: Admin staff, duty personnel

**Content**:
- Active members list
- Service number, name, rank, division, classification
- Optional: contact info, enrollment date

**Organization Options**:
- By Division
- By Rank
- Alphabetical

---

### 5. Visitor Activity Summary
**Purpose**: Track visitor traffic over a period
**Audience**: Security, Admin staff

**Content**:
- Visitors within selected period
- Organization, visit type, purpose, host
- Check-in/out times, duration
- Summary statistics by type/organization

**Filters**:
- Date range
- Visit type
- Organization

---

## PDF Template Design

### Letterhead (All Reports)
**Header**:
- HMCS CHIPPAWA crest (top left)
- Unit name: HMCS CHIPPAWA
- Address and contact information
- CAF crest (if applicable)

**Footer**:
- Report title
- Generated date/time
- Page X of Y
- Classification (if needed): "UNCLASSIFIED" or similar

### Visual Standards
- Executive quality - presentation-ready
- Consistent typography (Inter font family)
- Color coding for thresholds (green/yellow/red)
- Tables with alternating row colors for readability
- Charts where applicable (attendance trends)

---

## Settings Page Structure

### Training Year Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Training year start | September 1 | First day of training year |
| Training year end | May 31 | Last day of training year |
| Holiday exclusions | (list) | Date ranges to exclude from calculations |

### Schedule Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Training Night day | Tuesday | Primary training night |
| Training Night start | 19:00 | Start time |
| Training Night end | 22:10 | End time |
| Admin Night day | Thursday | Secondary night (informational) |
| Admin Night start | 19:00 | |
| Admin Night end | 22:10 | |

### Working Hours Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Regular weekday start | 08:00 | Mon/Wed/Fri FT Staff start |
| Regular weekday end | 16:00 | Mon/Wed/Fri FT Staff end |
| Regular weekdays | Mon, Wed, Fri | Days using regular hours |
| Summer start date | June 1 | When summer hours begin |
| Summer end date | August 31 | When summer hours end |
| Summer weekday start | 09:00 | Summer hours start |
| Summer weekday end | 15:00 | Summer hours end |

### Report Settings - Thresholds

| Setting | Default | Description |
|---------|---------|-------------|
| Warning threshold | 75% | Below this shows yellow flag |
| Critical threshold | 50% | Below this shows red flag |
| Show threshold flags | Yes | Toggle flag indicators |
| BMQ separate thresholds | No | Use different thresholds for BMQ |
| BMQ warning threshold | 80% | BMQ-specific warning level |
| BMQ critical threshold | 60% | BMQ-specific critical level |

### Report Settings - Member Handling

| Setting | Default | Description |
|---------|---------|-------------|
| New member grace period | 4 weeks | Members within this period show "New" |
| Minimum training nights | 3 | Need X nights to show percentage |
| Include Full-Time Staff | Yes | Include FT staff in training reports |
| Show BMQ badge | Yes | Show "BMQ" indicator for enrolled members |
| Show trend indicators | Yes | Show improvement/decline arrows |

### Report Settings - Formatting

| Setting | Default | Description |
|---------|---------|-------------|
| Default sort order | Division, then Rank | How to order members |
| Show service number | Yes | Include service # in reports |
| Date format | DD MMM YYYY | How dates appear |
| Page size | Letter | Letter vs A4 |

---

## BMQ Course Management

### BMQ Courses (Settings Subsection)

**Admin can**:
- Create new BMQ course (name, start date, end date, training day, times)
- View past/current courses
- Mark course active/inactive
- Edit course details

**Course Properties**:
- Name (e.g., "Fall 2024 BMQ", "Winter 2025 BMQ")
- Start date
- End date
- Training day (e.g., Saturday)
- Training time (e.g., 08:00 - 16:00)
- Is active flag

### BMQ Enrollment (Member Profile)

**Per member**:
- Assign to BMQ course
- View BMQ enrollment history
- Mark as completed/withdrawn
- Enrollment status: enrolled | completed | withdrawn

---

## Data Model Additions

### training_years
```sql
CREATE TABLE training_years (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL,           -- e.g., "2024-2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  holiday_exclusions JSONB DEFAULT '[]', -- Array of {start, end, name}
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### bmq_courses
```sql
CREATE TABLE bmq_courses (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,          -- e.g., "Fall 2024 BMQ"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  training_day VARCHAR(10) NOT NULL,   -- e.g., "saturday"
  training_start_time TIME NOT NULL,
  training_end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### bmq_enrollments
```sql
CREATE TABLE bmq_enrollments (
  id UUID PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id),
  bmq_course_id UUID NOT NULL REFERENCES bmq_courses(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'enrolled', -- enrolled | completed | withdrawn
  UNIQUE(member_id, bmq_course_id)
);
```

### report_settings
```sql
CREATE TABLE report_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Or single row with JSON blob for all settings
```

### scheduled_reports (Phase 3)
```sql
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  report_config JSONB NOT NULL,        -- Filters, organization, etc.
  schedule VARCHAR(50) NOT NULL,       -- Cron expression
  recipients TEXT[] NOT NULL,          -- Email addresses
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### report_audit_log
```sql
CREATE TABLE report_audit_log (
  id UUID PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,    -- e.g., 'training_night_attendance'
  report_config JSONB NOT NULL,        -- Filters/parameters used
  generated_by UUID REFERENCES users(id), -- NULL for scheduled reports
  is_scheduled BOOLEAN DEFAULT false,  -- true if from scheduled_reports
  scheduled_report_id UUID REFERENCES scheduled_reports(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_size_bytes INTEGER,             -- Size of generated PDF
  generation_time_ms INTEGER           -- How long it took to generate
);
```

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| PDF Generation (Frontend) | @react-pdf/renderer | Declarative React-based, type-safe, professional output |
| PDF Generation (Backend) | @react-pdf/renderer or Puppeteer | For scheduled reports |
| Email Service | Resend (recommended) | Modern API, React Email support, good free tier |
| Job Scheduling | BullMQ | Redis-based (already have Redis), reliable |
| Charts in PDF | Custom SVG components | react-pdf supports SVG natively |

---

## Attendance Calculation Logic

### Training Night Attendance %

```typescript
function calculateAttendance(member: Member, period: DateRange): AttendanceResult {
  const joinDate = member.enrollmentDate;
  const effectiveStart = max(period.start, joinDate);

  // Get all training nights in period (Tuesdays, excluding holidays)
  const possibleNights = getTrainingNights(effectiveStart, period.end);

  // Get check-ins during training night hours on training days
  const attendedNights = getTrainingNightCheckins(member.id, effectiveStart, period.end);

  // Handle new members
  if (daysSince(joinDate) < settings.newMemberGracePeriod) {
    return { status: 'new', badge: 'New' };
  }

  // Handle minimum attendance requirement
  if (possibleNights.length < settings.minimumTrainingNights) {
    return {
      status: 'insufficient_data',
      display: `${attendedNights.length} of ${possibleNights.length}`
    };
  }

  const percentage = (attendedNights.length / possibleNights.length) * 100;

  return {
    status: 'calculated',
    percentage,
    attended: attendedNights.length,
    possible: possibleNights.length,
    flag: getThresholdFlag(percentage, settings)
  };
}
```

### Trend Calculation

```typescript
function calculateTrend(member: Member, currentPeriod: DateRange): TrendResult {
  const previousPeriod = getPreviousPeriod(currentPeriod); // Same length, earlier

  const currentAttendance = calculateAttendance(member, currentPeriod);
  const previousAttendance = calculateAttendance(member, previousPeriod);

  if (currentAttendance.status !== 'calculated' || previousAttendance.status !== 'calculated') {
    return { trend: 'none' };
  }

  const delta = currentAttendance.percentage - previousAttendance.percentage;

  if (delta > 2) return { trend: 'up', delta };
  if (delta < -2) return { trend: 'down', delta };
  return { trend: 'stable', delta };
}
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] PDF template system with letterhead component
- [ ] Print stylesheets for browser printing
- [ ] Training Year settings UI and backend
- [ ] Report Settings UI and backend
- [ ] Basic report generation (presence report as PDF)

### Phase 2: Report Types & BMQ
- [ ] Training Night Attendance report (all organization options)
- [ ] BMQ course management UI
- [ ] BMQ enrollment on member profiles
- [ ] BMQ Attendance report
- [ ] Personnel roster PDF
- [ ] Visitor summary PDF
- [ ] Threshold flags and trend indicators

### Phase 3: Email & Automation
- [ ] Email service integration (Resend)
- [ ] Backend PDF generation service
- [ ] Scheduled reports configuration UI
- [ ] BullMQ job processing
- [ ] Email delivery with PDF attachments

---

## UI Mockup Notes

### Reports Page Enhancement

```
Reports
├── [Tab] Current Presence
│   └── [Button] Export CSV | [Button] Export PDF
├── [Tab] Training Night Attendance
│   ├── [Filters] Period | Division | Organization Style
│   └── [Button] Export CSV | [Button] Export PDF
├── [Tab] BMQ Attendance
│   ├── [Filters] Course | Division
│   └── [Button] Export PDF
├── [Tab] Personnel Roster
│   ├── [Filters] Division | Sort By
│   └── [Button] Export PDF
├── [Tab] Visitor History
│   ├── [Filters] Date Range | Type | Organization
│   └── [Button] Export CSV | [Button] Export PDF
└── [Tab] Scheduled Reports (Phase 3)
    └── List of configured scheduled reports
```

### Settings Page Enhancement

```
Settings
├── General (existing)
├── Training Year
│   ├── Current Training Year (start/end dates)
│   ├── Holiday Exclusions (add/remove date ranges)
│   └── Training Night Schedule (day, times)
├── Working Hours
│   ├── Regular Hours (Mon/Wed/Fri)
│   └── Summer Hours (dates + times)
├── Report Settings
│   ├── Attendance Thresholds
│   ├── Member Handling (grace periods, flags)
│   └── Formatting (sort order, date format, page size)
└── BMQ Courses
    ├── Active Courses
    ├── Past Courses
    └── [Button] Create New Course
```

---

## Security Considerations

- All reports contain personnel data - admin-only access
- Scheduled report recipients should be validated email addresses
- Consider audit logging for report generation
- PDF generation should not expose raw data in client console

---

## Resolved Questions

1. **Letterhead assets**: ✅ Unit crest available at `/home/sauk/projects/images/hmcs_chippawa_crest.jpg`
2. **Unit details**: ✅ HMCS CHIPPAWA, 1 Navy Way, Winnipeg MB
3. **Email domain**: Deferred to Phase 3 - will need verified domain with DNS records (SPF, DKIM)
4. **Audit requirements**: ✅ Yes - log who generated reports (user ID for manual, "system" for scheduled)

---

## Acceptance Criteria

### Phase 1 Complete When:
- [ ] Admin can configure training year dates and holidays
- [ ] Admin can configure report thresholds and settings
- [ ] User can generate a professional PDF of current presence report
- [ ] PDF includes proper letterhead and formatting
- [ ] Print stylesheet produces clean browser print output

### Phase 2 Complete When:
- [ ] Training Night Attendance report with all filters/organization options
- [ ] BMQ courses can be created and managed
- [ ] Members can be enrolled in BMQ courses
- [ ] BMQ Attendance report functional
- [ ] Threshold flags display correctly
- [ ] Trend indicators show for members with sufficient history
- [ ] New member grace period respected

### Phase 3 Complete When:
- [ ] Email service configured and verified
- [ ] Admin can create scheduled report configurations
- [ ] Scheduled reports generate and email on schedule
- [ ] Email contains PDF attachment
- [ ] Failed deliveries are logged/retried
