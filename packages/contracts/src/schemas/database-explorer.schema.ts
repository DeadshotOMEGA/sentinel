import * as v from 'valibot'

/**
 * Whitelist of allowed table names for database explorer
 * Excludes sensitive auth tables and internal system tables
 */
export const ALLOWED_TABLES = [
  // Core
  'AdminUser',
  'Member',
  'Badge',
  'Division',
  'Rank',
  // Attendance
  'Checkin',
  'Visitor',
  'Event',
  'EventAttendee',
  'EventCheckin',
  'MissedCheckout',
  // Unit Events
  'UnitEventType',
  'UnitEvent',
  'UnitEventDutyPosition',
  'UnitEventDutyAssignment',
  // Training / Qualifications
  'BmqCourse',
  'BmqEnrollment',
  'TrainingYear',
  'QualificationType',
  'MemberQualification',
  // Audit
  'AuditLog',
  'SecurityAlert',
  'ResponsibilityAuditLog',
  'report_audit_log',
  // Enums
  'MemberStatus',
  'MemberType',
  'VisitType',
  'BadgeStatus',
  'Tag',
  'MemberTag',
  'ListItem',
  // Config
  'Setting',
  'AlertConfig',
  'ReportSetting',
  'StatHoliday',
  // DDS / Scheduling
  'DdsAssignment',
  'DutyRole',
  'DutyPosition',
  'WeeklySchedule',
  'ScheduleAssignment',
  'LockupStatus',
  'LockupTransfer',
  'LockupExecution',
] as const

/**
 * Table categories for sidebar grouping
 */
export const TABLE_CATEGORIES: Record<string, readonly string[]> = {
  Core: ['AdminUser', 'Member', 'Badge', 'Division', 'Rank'],
  Attendance: ['Checkin', 'Visitor', 'Event', 'EventAttendee', 'EventCheckin', 'MissedCheckout'],
  'Unit Events': ['UnitEventType', 'UnitEvent', 'UnitEventDutyPosition', 'UnitEventDutyAssignment'],
  Training: [
    'BmqCourse',
    'BmqEnrollment',
    'TrainingYear',
    'QualificationType',
    'MemberQualification',
  ],
  Audit: ['AuditLog', 'SecurityAlert', 'ResponsibilityAuditLog', 'report_audit_log'],
  Enums: ['MemberStatus', 'MemberType', 'VisitType', 'BadgeStatus', 'Tag', 'MemberTag', 'ListItem'],
  Config: ['Setting', 'AlertConfig', 'ReportSetting', 'StatHoliday'],
  DDS: [
    'DdsAssignment',
    'DutyRole',
    'DutyPosition',
    'WeeklySchedule',
    'ScheduleAssignment',
    'LockupStatus',
    'LockupTransfer',
    'LockupExecution',
  ],
}

/**
 * Table name schema (picklist of allowed tables)
 */
export const TableNameSchema = v.picklist(ALLOWED_TABLES, 'Invalid table name')

/**
 * Table info response (single table with row count)
 */
export const TableInfoSchema = v.object({
  name: v.string(),
  rowCount: v.number(),
  category: v.string(),
})

/**
 * List of available tables with row counts
 */
export const TableListResponseSchema = v.object({
  tables: v.array(TableInfoSchema),
})

/**
 * Column metadata
 */
export const ColumnMetadataSchema = v.object({
  name: v.string(),
  type: v.string(),
  isNullable: v.boolean(),
  isPrimaryKey: v.boolean(),
  isForeignKey: v.boolean(),
})

/**
 * Query parameters for table data
 */
export const TableDataQuerySchema = v.object({
  page: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1))),
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.minValue(1), v.maxValue(100))
  ),
  sortBy: v.optional(v.string()),
  sortOrder: v.optional(v.picklist(['asc', 'desc'])),
})

/**
 * Path params for table data endpoint
 */
export const TablePathParamsSchema = v.object({
  table: TableNameSchema,
})

/**
 * Table data response with pagination and column metadata
 */
export const TableDataResponseSchema = v.object({
  table: v.string(),
  columns: v.array(ColumnMetadataSchema),
  rows: v.array(v.record(v.string(), v.unknown())),
  total: v.number(),
  page: v.number(),
  limit: v.number(),
  totalPages: v.number(),
})

/**
 * Type exports
 */
export type TableName = v.InferOutput<typeof TableNameSchema>
export type TableInfo = v.InferOutput<typeof TableInfoSchema>
export type TableListResponse = v.InferOutput<typeof TableListResponseSchema>
export type ColumnMetadata = v.InferOutput<typeof ColumnMetadataSchema>
export type TableDataQuery = v.InferOutput<typeof TableDataQuerySchema>
export type TablePathParams = v.InferOutput<typeof TablePathParamsSchema>
export type TableDataResponse = v.InferOutput<typeof TableDataResponseSchema>
