import { initServer } from '@ts-rest/express'
import { databaseExplorerContract } from '@sentinel/contracts'
import type { TableDataQuery, TablePathParams } from '@sentinel/contracts'
import { ALLOWED_TABLES, TABLE_CATEGORIES } from '@sentinel/contracts'
import { getPrismaClient } from '../lib/database.js'
import { Prisma } from '@sentinel/database'

const s = initServer()

// Map Prisma model names to their database table names
const MODEL_TO_TABLE: Record<string, string> = {
  AdminUser: 'admin_users',
  Member: 'members',
  Badge: 'badges',
  Division: 'divisions',
  Rank: 'ranks',
  Checkin: 'checkins',
  Visitor: 'visitors',
  Event: 'events',
  EventAttendee: 'event_attendees',
  EventCheckin: 'event_checkins',
  MissedCheckout: 'missed_checkouts',
  UnitEventType: 'unit_event_types',
  UnitEvent: 'unit_events',
  UnitEventDutyPosition: 'unit_event_duty_positions',
  UnitEventDutyAssignment: 'unit_event_duty_assignments',
  BmqCourse: 'bmq_courses',
  BmqEnrollment: 'bmq_enrollments',
  TrainingYear: 'training_years',
  QualificationType: 'qualification_types',
  MemberQualification: 'member_qualifications',
  AuditLog: 'audit_log',
  SecurityAlert: 'security_alerts',
  ResponsibilityAuditLog: 'responsibility_audit_log',
  report_audit_log: 'report_audit_log',
  MemberStatus: 'member_statuses',
  MemberType: 'member_types',
  VisitType: 'visit_types',
  BadgeStatus: 'badge_statuses',
  Tag: 'tags',
  MemberTag: 'member_tags',
  ListItem: 'list_items',
  Setting: 'settings',
  AlertConfig: 'alert_configs',
  ReportSetting: 'report_settings',
  StatHoliday: 'stat_holidays',
  DdsAssignment: 'dds_assignments',
  DutyRole: 'duty_roles',
  DutyPosition: 'duty_positions',
  WeeklySchedule: 'weekly_schedules',
  ScheduleAssignment: 'schedule_assignments',
  LockupStatus: 'lockup_status',
  LockupTransfer: 'lockup_transfers',
  LockupExecution: 'lockup_executions',
}

// Get category for a table
function getTableCategory(tableName: string): string {
  for (const [category, tables] of Object.entries(TABLE_CATEGORIES)) {
    if (tables.includes(tableName)) {
      return category
    }
  }
  return 'Other'
}

// Get column metadata from Prisma DMMF
function getColumnMetadata(modelName: string) {
  const dmmf = Prisma.dmmf
  const model = dmmf.datamodel.models.find((m) => m.name === modelName)

  if (!model) {
    return []
  }

  return model.fields
    .filter((field) => field.kind === 'scalar' || field.kind === 'enum')
    .map((field) => ({
      name: field.name,
      type: field.type,
      isNullable: !field.isRequired,
      isPrimaryKey: field.isId || false,
      isForeignKey: field.name.endsWith('Id') && field.name !== 'id',
    }))
}

/**
 * Database Explorer route implementation using ts-rest
 */
export const databaseExplorerRouter = s.router(databaseExplorerContract, {
  /**
   * List all available tables with row counts
   */
  listTables: async () => {
    try {
      const prisma = getPrismaClient()
      const tables = []

      for (const modelName of ALLOWED_TABLES) {
        const tableName = MODEL_TO_TABLE[modelName]
        if (!tableName) continue

        // Get row count using raw SQL
        const result = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*) as count FROM "${tableName}"`
        )
        const rowCount = Number(result[0]?.count ?? 0)

        tables.push({
          name: modelName,
          rowCount,
          category: getTableCategory(modelName),
        })
      }

      return {
        status: 200 as const,
        body: { tables },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list tables',
        },
      }
    }
  },

  /**
   * Get paginated data from a specific table
   */
  getTableData: async ({ params, query }: { params: TablePathParams; query: TableDataQuery }) => {
    try {
      const prisma = getPrismaClient()
      const { table: modelName } = params
      const page = query.page ?? 1
      const limit = query.limit ?? 25
      const sortBy = query.sortBy ?? 'id'
      const sortOrder = query.sortOrder ?? 'desc'

      // Verify table is in whitelist
      if (!ALLOWED_TABLES.includes(modelName as (typeof ALLOWED_TABLES)[number])) {
        return {
          status: 400 as const,
          body: {
            error: 'BAD_REQUEST',
            message: `Table '${modelName}' is not allowed`,
          },
        }
      }

      const tableName = MODEL_TO_TABLE[modelName]
      if (!tableName) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Table '${modelName}' not found`,
          },
        }
      }

      // Get column metadata
      const columns = getColumnMetadata(modelName)

      // Validate sortBy column exists
      const validSortColumn = columns.some((col) => col.name === sortBy)
      const actualSortBy = validSortColumn ? sortBy : 'id'

      // Get total count
      const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      )
      const total = Number(countResult[0]?.count ?? 0)

      // Map camelCase sortBy to snake_case for database
      const snakeCaseSortBy = actualSortBy
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')

      // Get paginated data with dynamic ordering
      const offset = (page - 1) * limit
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM "${tableName}" ORDER BY "${snakeCaseSortBy}" ${sortOrder.toUpperCase()} LIMIT ${limit} OFFSET ${offset}`
      )

      // Convert snake_case column names to camelCase in results
      const transformedRows = rows.map((row) => {
        const transformed: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(row)) {
          // Convert snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
          // Convert BigInt to number for JSON serialization
          if (typeof value === 'bigint') {
            transformed[camelKey] = Number(value)
          } else if (value instanceof Date) {
            transformed[camelKey] = value.toISOString()
          } else {
            transformed[camelKey] = value
          }
        }
        return transformed
      })

      const totalPages = Math.ceil(total / limit)

      return {
        status: 200 as const,
        body: {
          table: modelName,
          columns,
          rows: transformedRows,
          total,
          page,
          limit,
          totalPages,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get table data',
        },
      }
    }
  },
})
