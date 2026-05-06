import * as v from 'valibot'
import { SortOrderEnum } from './report-setting.schema.js'

/**
 * Report Schemas
 *
 * Valibot schemas for report generation endpoints
 */

// ============================================================================
// Enums
// ============================================================================

export const OrganizationOptionEnum = v.picklist([
  'full_unit',
  'grouped_by_division',
  'separated_by_division',
  'specific_division',
  'specific_member',
])

export const MemberTypeFilterEnum = v.picklist(['all', 'ft_staff', 'reserve'])

export const AttendanceStatusEnum = v.picklist(['new', 'insufficient_data', 'calculated'])

export const ThresholdFlagEnum = v.picklist(['none', 'warning', 'critical'])

export const TrendDirectionEnum = v.picklist(['up', 'down', 'stable', 'none'])

export const OperationalReportTypeEnum = v.picklist([
  'daily_presence',
  'weekly_presence',
  'monthly_presence',
  'training_night_monthly',
  'visitor_activity',
])

export const OperationalReportScopeEnum = v.picklist([
  'everyone',
  'department',
  'tag',
  'fts',
  'geo',
])

export const PresenceSessionStatusEnum = v.picklist(['complete', 'open', 'degraded'])

export const KeyNightCategoryEnum = v.picklist(['training', 'administrative'])

export const KeyNightSourceEnum = v.picklist([
  'unit_event',
  'operational_timings',
  'report_settings',
])

export const KeyNightRequirementEnum = v.picklist(['required', 'optional', 'not_expected'])

const LocalDateSchema = v.pipe(
  v.string('Date is required'),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
)

const LocalMonthSchema = v.pipe(
  v.string('Month is required'),
  v.regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
)

const UuidSchema = v.pipe(v.string(), v.uuid('Invalid ID format'))

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Daily check-in report configuration
 */
export const DailyCheckinConfigSchema = v.object({
  divisionId: v.optional(v.pipe(v.string(), v.uuid())),
  memberType: v.optional(MemberTypeFilterEnum, 'all'),
})

export type DailyCheckinConfig = v.InferOutput<typeof DailyCheckinConfigSchema>

/**
 * Training night attendance report configuration
 */
export const TrainingNightReportConfigSchema = v.pipe(
  v.object({
    period: v.optional(v.picklist(['current_year', 'last_quarter', 'last_month', 'custom'])),
    periodStart: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
    periodEnd: v.optional(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
    organizationOption: OrganizationOptionEnum,
    divisionId: v.optional(v.pipe(v.string(), v.uuid())),
    memberId: v.optional(v.pipe(v.string(), v.uuid())),
    includeFTStaff: v.optional(v.boolean(), false),
    showBMQBadge: v.optional(v.boolean(), true),
  }),
  v.check((data) => {
    // If period is custom, both periodStart and periodEnd are required
    if (data.period === 'custom' && (!data.periodStart || !data.periodEnd)) {
      return false
    }
    return true
  }, 'Custom period requires both periodStart and periodEnd')
)

export type TrainingNightReportConfig = v.InferOutput<typeof TrainingNightReportConfigSchema>

/**
 * BMQ attendance report configuration
 */
export const BMQReportConfigSchema = v.object({
  courseId: v.pipe(v.string(), v.uuid()),
  organizationOption: OrganizationOptionEnum,
  divisionId: v.optional(v.pipe(v.string(), v.uuid())),
})

export type BMQReportConfig = v.InferOutput<typeof BMQReportConfigSchema>

/**
 * Personnel roster report configuration
 */
export const PersonnelRosterConfigSchema = v.object({
  divisionId: v.optional(v.pipe(v.string(), v.uuid())),
  sortOrder: SortOrderEnum,
})

export type PersonnelRosterConfig = v.InferOutput<typeof PersonnelRosterConfigSchema>

/**
 * Visitor summary report configuration
 */
export const VisitorSummaryConfigSchema = v.pipe(
  v.object({
    startDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
    endDate: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
    visitType: v.optional(v.string()),
    organization: v.optional(v.string()),
  }),
  v.check(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    'Start date must be before or equal to end date'
  )
)

export type VisitorSummaryConfig = v.InferOutput<typeof VisitorSummaryConfigSchema>

/**
 * Shared operational presence report request.
 */
export const PresenceReportConfigSchema = v.object({
  scopeType: v.optional(OperationalReportScopeEnum, 'everyone'),
  divisionId: v.optional(UuidSchema),
  tagId: v.optional(UuidSchema),
})

export type PresenceReportConfig = v.InferOutput<typeof PresenceReportConfigSchema>

export const DailyPresenceReportConfigSchema = v.object({
  date: LocalDateSchema,
  scopeType: v.optional(OperationalReportScopeEnum, 'everyone'),
  divisionId: v.optional(UuidSchema),
  tagId: v.optional(UuidSchema),
})

export type DailyPresenceReportConfig = v.InferOutput<typeof DailyPresenceReportConfigSchema>

export const WeeklyPresenceReportConfigSchema = v.object({
  weekStartDate: LocalDateSchema,
  scopeType: v.optional(OperationalReportScopeEnum, 'everyone'),
  divisionId: v.optional(UuidSchema),
  tagId: v.optional(UuidSchema),
})

export type WeeklyPresenceReportConfig = v.InferOutput<typeof WeeklyPresenceReportConfigSchema>

export const MonthlyPresenceReportConfigSchema = v.object({
  month: LocalMonthSchema,
  scopeType: v.optional(OperationalReportScopeEnum, 'everyone'),
  divisionId: v.optional(UuidSchema),
  tagId: v.optional(UuidSchema),
})

export type MonthlyPresenceReportConfig = v.InferOutput<typeof MonthlyPresenceReportConfigSchema>

export const TrainingNightMonthlyReportConfigSchema = v.object({
  month: LocalMonthSchema,
  divisionId: UuidSchema,
})

export type TrainingNightMonthlyReportConfig = v.InferOutput<
  typeof TrainingNightMonthlyReportConfigSchema
>

export const VisitorActivityReportConfigSchema = v.pipe(
  v.object({
    startDate: LocalDateSchema,
    endDate: LocalDateSchema,
    visitType: v.optional(v.string()),
    visitorPurpose: v.optional(v.string()),
    eventLinked: v.optional(v.boolean()),
    hostMemberId: v.optional(UuidSchema),
    organization: v.optional(v.string()),
  }),
  v.check(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    'Start date must be before or equal to end date'
  )
)

export type VisitorActivityReportConfig = v.InferOutput<typeof VisitorActivityReportConfigSchema>

// ============================================================================
// Response Component Schemas
// ============================================================================

/**
 * Member summary (minimal member data for reports)
 */
export const MemberSummarySchema = v.object({
  id: v.string(),
  serviceNumber: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  rank: v.string(),
  division: v.object({
    id: v.string(),
    name: v.string(),
  }),
})

export type MemberSummary = v.InferOutput<typeof MemberSummarySchema>

/**
 * Attendance calculation result
 */
export const AttendanceCalculationSchema = v.object({
  status: AttendanceStatusEnum,
  percentage: v.optional(v.number()),
  attended: v.optional(v.number()),
  possible: v.optional(v.number()),
  flag: v.optional(ThresholdFlagEnum),
  badge: v.optional(v.string()),
  display: v.optional(v.string()),
})

export type AttendanceCalculation = v.InferOutput<typeof AttendanceCalculationSchema>

/**
 * Trend indicator
 */
export const TrendIndicatorSchema = v.object({
  trend: TrendDirectionEnum,
  delta: v.optional(v.number()),
})

export type TrendIndicator = v.InferOutput<typeof TrendIndicatorSchema>

export const ReportGeneratedBySchema = v.object({
  id: v.string(),
  displayName: v.string(),
})

export type ReportGeneratedBy = v.InferOutput<typeof ReportGeneratedBySchema>

export const ReportDateRangeSchema = v.object({
  startDate: v.string(),
  endDate: v.string(),
  label: v.string(),
})

export type ReportDateRange = v.InferOutput<typeof ReportDateRangeSchema>

export const ReportFilterSummarySchema = v.object({
  scopeLabel: v.string(),
  divisionId: v.optional(v.string()),
  tagId: v.optional(v.string()),
  visitorType: v.optional(v.string()),
  visitorPurpose: v.optional(v.string()),
  eventCategory: v.optional(v.string()),
})

export type ReportFilterSummary = v.InferOutput<typeof ReportFilterSummarySchema>

const ReportEnvelopeBaseEntries = {
  reportType: OperationalReportTypeEnum,
  title: v.string(),
  generatedAt: v.string(),
  generatedBy: ReportGeneratedBySchema,
  unitName: v.string(),
  dateRange: ReportDateRangeSchema,
  filters: ReportFilterSummarySchema,
  warnings: v.array(v.string()),
}

export const ReportDivisionSummarySchema = v.object({
  id: v.nullable(v.string()),
  code: v.nullable(v.string()),
  name: v.string(),
})

export type ReportDivisionSummary = v.InferOutput<typeof ReportDivisionSummarySchema>

export const ReportTagSummarySchema = v.object({
  id: v.string(),
  name: v.string(),
  chipVariant: v.nullable(v.string()),
  chipColor: v.nullable(v.string()),
  isPositional: v.boolean(),
  source: v.picklist(['direct', 'qualification']),
})

export type ReportTagSummary = v.InferOutput<typeof ReportTagSummarySchema>

export const ReportMemberSummarySchema = v.object({
  id: v.string(),
  displayName: v.string(),
  rank: v.string(),
  status: v.string(),
  division: v.nullable(ReportDivisionSummarySchema),
  memberType: v.nullable(v.string()),
  tags: v.array(ReportTagSummarySchema),
})

export type ReportMemberSummary = v.InferOutput<typeof ReportMemberSummarySchema>

export const PresenceSessionSchema = v.object({
  inAt: v.string(),
  outAt: v.nullable(v.string()),
  durationMinutes: v.nullable(v.number()),
  status: PresenceSessionStatusEnum,
})

export type PresenceSession = v.InferOutput<typeof PresenceSessionSchema>

export const PresenceMarkerSchema = v.object({
  date: v.string(),
  label: v.string(),
  present: v.boolean(),
  firstIn: v.nullable(v.string()),
  lastOut: v.nullable(v.string()),
  sessionCount: v.number(),
  note: v.nullable(v.string()),
})

export type PresenceMarker = v.InferOutput<typeof PresenceMarkerSchema>

export const KeyNightSchema = v.object({
  id: v.string(),
  category: KeyNightCategoryEnum,
  source: KeyNightSourceEnum,
  ruleId: v.nullable(v.string()),
  date: v.string(),
  label: v.string(),
  title: v.string(),
  startAt: v.nullable(v.string()),
  endAt: v.nullable(v.string()),
  requiredAudienceLabel: v.nullable(v.string()),
  optionalAudienceLabel: v.nullable(v.string()),
})

export type KeyNight = v.InferOutput<typeof KeyNightSchema>

export const KeyNightPresenceMarkerSchema = v.object({
  keyNightId: v.string(),
  present: v.boolean(),
  firstIn: v.nullable(v.string()),
  lastOut: v.nullable(v.string()),
  requirement: KeyNightRequirementEnum,
})

export type KeyNightPresenceMarker = v.InferOutput<typeof KeyNightPresenceMarkerSchema>

export const DailyPresenceRowSchema = v.object({
  member: ReportMemberSummarySchema,
  firstIn: v.nullable(v.string()),
  lastOut: v.nullable(v.string()),
  sessionCount: v.number(),
  leftAndReturned: v.boolean(),
  sessions: v.array(PresenceSessionSchema),
})

export type DailyPresenceRow = v.InferOutput<typeof DailyPresenceRowSchema>

export const DailyPresenceReportDataSchema = v.object({
  summary: v.object({
    totalScopedMembers: v.number(),
    presentMembers: v.number(),
    totalSessions: v.number(),
    leftAndReturnedCount: v.number(),
    openSessionCount: v.number(),
  }),
  rows: v.array(DailyPresenceRowSchema),
})

export type DailyPresenceReportData = v.InferOutput<typeof DailyPresenceReportDataSchema>

export const DailyPresenceReportResponseSchema = v.object({
  ...ReportEnvelopeBaseEntries,
  reportType: v.literal('daily_presence'),
  data: DailyPresenceReportDataSchema,
})

export type DailyPresenceReportResponse = v.InferOutput<typeof DailyPresenceReportResponseSchema>

export const WeeklyPresenceRowSchema = v.object({
  member: ReportMemberSummarySchema,
  days: v.array(PresenceMarkerSchema),
  trainingNightPresent: v.nullable(v.boolean()),
  adminNightPresent: v.nullable(v.boolean()),
  keyNights: v.array(KeyNightPresenceMarkerSchema),
  totalDaysPresent: v.number(),
  totalSessions: v.number(),
})

export type WeeklyPresenceRow = v.InferOutput<typeof WeeklyPresenceRowSchema>

export const WeeklyPresenceReportDataSchema = v.object({
  summary: v.object({
    totalMembers: v.number(),
    membersWithPresence: v.number(),
    trainingNightCount: v.number(),
    adminNightCount: v.number(),
  }),
  days: v.array(
    v.object({
      date: v.string(),
      label: v.string(),
      isTrainingNight: v.boolean(),
      isAdminNight: v.boolean(),
    })
  ),
  keyNights: v.array(KeyNightSchema),
  rows: v.array(WeeklyPresenceRowSchema),
})

export type WeeklyPresenceReportData = v.InferOutput<typeof WeeklyPresenceReportDataSchema>

export const WeeklyPresenceReportResponseSchema = v.object({
  ...ReportEnvelopeBaseEntries,
  reportType: v.literal('weekly_presence'),
  data: WeeklyPresenceReportDataSchema,
})

export type WeeklyPresenceReportResponse = v.InferOutput<typeof WeeklyPresenceReportResponseSchema>

export const MonthlyPresenceRowSchema = v.object({
  member: ReportMemberSummarySchema,
  days: v.array(PresenceMarkerSchema),
  keyNights: v.array(KeyNightPresenceMarkerSchema),
  totalDaysPresent: v.number(),
  totalSessions: v.number(),
  trainingNightsPresent: v.number(),
  adminNightsPresent: v.number(),
})

export type MonthlyPresenceRow = v.InferOutput<typeof MonthlyPresenceRowSchema>

export const MonthlyPresenceReportDataSchema = v.object({
  summary: v.object({
    totalMembers: v.number(),
    membersWithPresence: v.number(),
    totalMemberDaysPresent: v.number(),
    trainingNightCount: v.number(),
    adminNightCount: v.number(),
  }),
  days: v.array(
    v.object({
      date: v.string(),
      label: v.string(),
      isTrainingNight: v.boolean(),
      isAdminNight: v.boolean(),
    })
  ),
  keyNights: v.array(KeyNightSchema),
  rows: v.array(MonthlyPresenceRowSchema),
})

export type MonthlyPresenceReportData = v.InferOutput<typeof MonthlyPresenceReportDataSchema>

export const MonthlyPresenceReportResponseSchema = v.object({
  ...ReportEnvelopeBaseEntries,
  reportType: v.literal('monthly_presence'),
  data: MonthlyPresenceReportDataSchema,
})

export type MonthlyPresenceReportResponse = v.InferOutput<
  typeof MonthlyPresenceReportResponseSchema
>

export const TrainingNightMonthlyRowSchema = v.object({
  member: ReportMemberSummarySchema,
  nights: v.array(KeyNightPresenceMarkerSchema),
  attended: v.number(),
  possible: v.number(),
  percentage: v.number(),
})

export type TrainingNightMonthlyRow = v.InferOutput<typeof TrainingNightMonthlyRowSchema>

export const TrainingNightMonthlyReportDataSchema = v.object({
  department: v.nullable(ReportDivisionSummarySchema),
  trainingNights: v.array(KeyNightSchema),
  rows: v.array(TrainingNightMonthlyRowSchema),
  summary: v.object({
    totalMembers: v.number(),
    trainingNightCount: v.number(),
    averageAttendancePercentage: v.number(),
  }),
})

export type TrainingNightMonthlyReportData = v.InferOutput<
  typeof TrainingNightMonthlyReportDataSchema
>

export const TrainingNightMonthlyReportResponseSchema = v.object({
  ...ReportEnvelopeBaseEntries,
  reportType: v.literal('training_night_monthly'),
  data: TrainingNightMonthlyReportDataSchema,
})

export type TrainingNightMonthlyReportResponse = v.InferOutput<
  typeof TrainingNightMonthlyReportResponseSchema
>

export const VisitorActivityRowSchema = v.object({
  id: v.string(),
  displayName: v.string(),
  organization: v.nullable(v.string()),
  visitType: v.string(),
  visitPurpose: v.nullable(v.string()),
  visitReason: v.nullable(v.string()),
  checkInTime: v.string(),
  checkOutTime: v.nullable(v.string()),
  durationMinutes: v.nullable(v.number()),
  event: v.nullable(
    v.object({
      id: v.string(),
      name: v.string(),
    })
  ),
  host: v.nullable(
    v.object({
      id: v.string(),
      displayName: v.string(),
    })
  ),
})

export type VisitorActivityRow = v.InferOutput<typeof VisitorActivityRowSchema>

export const VisitorActivityReportDataSchema = v.object({
  summary: v.object({
    totalVisitors: v.number(),
    activeAtEnd: v.number(),
    byVisitType: v.array(
      v.object({
        label: v.string(),
        count: v.number(),
      })
    ),
    byPurpose: v.array(
      v.object({
        label: v.string(),
        count: v.number(),
      })
    ),
    byEvent: v.array(
      v.object({
        label: v.string(),
        count: v.number(),
      })
    ),
  }),
  rows: v.array(VisitorActivityRowSchema),
})

export type VisitorActivityReportData = v.InferOutput<typeof VisitorActivityReportDataSchema>

export const VisitorActivityReportResponseSchema = v.object({
  ...ReportEnvelopeBaseEntries,
  reportType: v.literal('visitor_activity'),
  data: VisitorActivityReportDataSchema,
})

export type VisitorActivityReportResponse = v.InferOutput<
  typeof VisitorActivityReportResponseSchema
>

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Daily check-in report response
 */
export const DailyCheckinReportSchema = v.object({
  generatedAt: v.string(),
  presentFTStaff: v.array(MemberSummarySchema),
  absentFTStaff: v.array(MemberSummarySchema),
  presentReserve: v.array(MemberSummarySchema),
  summary: v.object({
    totalFTStaff: v.number(),
    totalReserve: v.number(),
    totalAbsentFTStaff: v.number(),
    byDivision: v.array(
      v.object({
        divisionId: v.string(),
        divisionName: v.string(),
        ftStaff: v.number(),
        reserve: v.number(),
      })
    ),
  }),
})

export type DailyCheckinReport = v.InferOutput<typeof DailyCheckinReportSchema>

/**
 * Training night attendance record
 */
export const TrainingNightAttendanceRecordSchema = v.object({
  member: MemberSummarySchema,
  attendance: AttendanceCalculationSchema,
  trend: TrendIndicatorSchema,
  isBMQEnrolled: v.boolean(),
  enrollmentDate: v.string(),
})

export type TrainingNightAttendanceRecord = v.InferOutput<
  typeof TrainingNightAttendanceRecordSchema
>

/**
 * Training night attendance report response
 */
export const TrainingNightAttendanceReportSchema = v.object({
  generatedAt: v.string(),
  config: TrainingNightReportConfigSchema,
  periodStart: v.string(),
  periodEnd: v.string(),
  records: v.array(TrainingNightAttendanceRecordSchema),
})

export type TrainingNightAttendanceReport = v.InferOutput<
  typeof TrainingNightAttendanceReportSchema
>

/**
 * BMQ attendance record
 */
export const BMQAttendanceRecordSchema = v.object({
  member: MemberSummarySchema,
  attendance: AttendanceCalculationSchema,
  enrollment: v.object({
    id: v.string(),
    enrolledAt: v.string(),
    completedAt: v.nullable(v.string()),
    status: v.string(),
  }),
})

export type BMQAttendanceRecord = v.InferOutput<typeof BMQAttendanceRecordSchema>

/**
 * BMQ attendance report response
 */
export const BMQAttendanceReportSchema = v.object({
  generatedAt: v.string(),
  config: BMQReportConfigSchema,
  records: v.array(BMQAttendanceRecordSchema),
})

export type BMQAttendanceReport = v.InferOutput<typeof BMQAttendanceReportSchema>

/**
 * Personnel roster record
 */
export const PersonnelRosterRecordSchema = v.object({
  id: v.string(),
  serviceNumber: v.string(),
  rank: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  middleInitial: v.nullable(v.string()),
  division: v.object({
    id: v.string(),
    name: v.string(),
  }),
  badgeId: v.nullable(v.string()),
  status: v.string(),
  memberType: v.string(),
  email: v.nullable(v.string()),
  phoneNumber: v.nullable(v.string()),
})

export type PersonnelRosterRecord = v.InferOutput<typeof PersonnelRosterRecordSchema>

/**
 * Personnel roster report response
 */
export const PersonnelRosterReportSchema = v.object({
  generatedAt: v.string(),
  config: PersonnelRosterConfigSchema,
  records: v.array(PersonnelRosterRecordSchema),
})

export type PersonnelRosterReport = v.InferOutput<typeof PersonnelRosterReportSchema>

/**
 * Visitor summary record
 */
export const VisitorSummaryRecordSchema = v.object({
  id: v.string(),
  fullName: v.string(),
  organization: v.nullable(v.string()),
  purpose: v.nullable(v.string()),
  visitType: v.string(),
  checkInTime: v.string(),
  checkOutTime: v.nullable(v.string()),
  duration: v.nullable(v.number()),
  hostMember: v.nullable(MemberSummarySchema),
})

export type VisitorSummaryRecord = v.InferOutput<typeof VisitorSummaryRecordSchema>

/**
 * Visitor summary report response
 */
export const VisitorSummaryReportSchema = v.object({
  generatedAt: v.string(),
  config: VisitorSummaryConfigSchema,
  records: v.array(VisitorSummaryRecordSchema),
  summary: v.object({
    totalVisitors: v.number(),
    byVisitType: v.array(
      v.object({
        visitType: v.string(),
        count: v.number(),
      })
    ),
    byOrganization: v.array(
      v.object({
        organization: v.string(),
        count: v.number(),
      })
    ),
  }),
})

export type VisitorSummaryReport = v.InferOutput<typeof VisitorSummaryReportSchema>

/**
 * Error response schema
 */
export const ReportErrorResponseSchema = v.object({
  error: v.string(),
  message: v.string(),
})

export type ReportErrorResponse = v.InferOutput<typeof ReportErrorResponseSchema>
