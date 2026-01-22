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
    period: v.optional(
      v.picklist(['current_year', 'last_quarter', 'last_month', 'custom'])
    ),
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

export type TrainingNightReportConfig = v.InferOutput<
  typeof TrainingNightReportConfigSchema
>

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
