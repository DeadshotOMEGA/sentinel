import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma, Prisma } from '@sentinel/database'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'unassign'
  | 'flag'
  | 'unflag'
  | 'export'
  | 'import'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'checkin_scan'
  | 'checkin_login'
  | 'checkin_manual_create'
  | 'member_create'
  | 'member_update'
  | 'member_delete'
  | 'member_bulk_update'
  | 'member_tag_add'
  | 'member_tag_remove'
  | 'badge_assign'
  | 'badge_unassign'
  | 'badge_status_change'
  | 'badge_create'
  | 'badge_delete'
  | 'setting_create'
  | 'setting_update'
  | 'setting_delete'
  | 'network_settings_update'
  | 'operational_timings_update'
  | 'remote_system_create'
  | 'remote_system_update'
  | 'remote_system_delete'
  | 'remote_system_reorder'
  | 'admin_create'
  | 'admin_update'
  | 'admin_delete'
  | 'import_preview'
  | 'import_execute'
  | 'tag_create'
  | 'tag_update'
  | 'tag_delete'
  | 'event_create'
  | 'event_update'
  | 'event_delete'
  | 'attendee_import'
  | 'dev_tools_access'
  | 'dev_tools_clear_all'
  | 'dev_tools_clear_table'
  | 'dev_tools_reset'
  | 'dev_tools_simulate'
  | 'dev_tools_backdate_members'
  | 'dev_tools_seed_scenario'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_disabled'
  | 'user_enabled'
  | 'password_reset'
  | 'role_changed'
  | 'checkin_update'
  | 'checkin_delete'
  | 'checkin_manual_checkout'
  | 'dds_accept'
  | 'dds_assign'
  | 'dds_transfer'
  | 'dds_release'
  | 'lockup_acquire'
  | 'lockup_open'
  | 'lockup_transfer'
  | 'lockup_execute'
  | 'duty_watch_live_assignment_set'
  | 'duty_watch_live_assignment_clear'
  | 'duty_watch_override_create'

interface AuditLogEntry {
  adminUserId: string | null
  action: AuditAction
  entityType: string
  entityId: string | null
  details: Record<string, unknown>
  ipAddress: string
}

interface AuditLogFilters {
  action?: string | string[]
  adminUserId?: string
  entityType?: string
  entityId?: string
  startDate?: Date
  endDate?: Date
}

const adminUserSelect = {
  id: true,
  username: true,
  displayName: true,
} as const

const AUDIT_REDACTED_VALUE = '[REDACTED]'
const SENSITIVE_AUDIT_KEY_PATTERN =
  /authorization|cookie|hash|passphrase|password|pin|secret|token|api[-_]?key/i

function sanitizeAuditValue(value: unknown, key?: string): Prisma.InputJsonValue | null {
  if (value === undefined) {
    return null
  }

  if (key && SENSITIVE_AUDIT_KEY_PATTERN.test(key)) {
    return AUDIT_REDACTED_VALUE
  }

  if (value === null) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item))
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .map(([nestedKey, nestedValue]) => [nestedKey, sanitizeAuditValue(nestedValue, nestedKey)])

    return Object.fromEntries(entries) as Prisma.InputJsonObject
  }

  return String(value)
}

function sanitizeAuditDetails(details: Record<string, unknown>): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, sanitizeAuditValue(value, key)])
  ) as Prisma.InputJsonObject
}

export type AuditLogWithAdminRecord = Prisma.AuditLogGetPayload<{
  include: { adminUser: { select: typeof adminUserSelect } }
}>

export class AuditRepository {
  private prisma: PrismaClientInstance

  /**
   * @param prismaClient - Optional Prisma client (injected in tests)
   */
  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  async log(entry: AuditLogEntry): Promise<AuditLogWithAdminRecord> {
    return await this.prisma.auditLog.create({
      data: {
        adminUserId: entry.adminUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: sanitizeAuditDetails(entry.details),
        ipAddress: entry.ipAddress,
      },
      include: {
        adminUser: {
          select: adminUserSelect,
        },
      },
    })
  }

  /**
   * Find audit logs with pagination and filtering
   */
  async findAuditLogs(
    filters: AuditLogFilters,
    pagination: { page: number; limit: number }
  ): Promise<AuditLogWithAdminRecord[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: this.buildWhere(filters),
      include: {
        adminUser: {
          select: adminUserSelect,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    })

    return logs
  }

  /**
   * Count audit logs matching filters
   */
  async countAuditLogs(filters: AuditLogFilters): Promise<number> {
    return await this.prisma.auditLog.count({ where: this.buildWhere(filters) })
  }

  async findById(id: string): Promise<AuditLogWithAdminRecord | null> {
    return await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        adminUser: {
          select: adminUserSelect,
        },
      },
    })
  }

  async getStats(filters: AuditLogFilters): Promise<{
    total: number
    byAction: Record<string, number>
    byEntityType: Record<string, number>
    byAdmin: Array<{
      adminUserId: string
      adminUsername: string
      count: number
    }>
    recentActivity: AuditLogWithAdminRecord[]
  }> {
    const where = this.buildWhere(filters)

    const [total, byActionRows, byEntityTypeRows, byAdminRows, recentActivity] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: {
          action: true,
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: {
          entityType: true,
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['adminUserId'],
        where: {
          ...where,
          adminUserId: {
            not: null,
          },
        },
        _count: {
          adminUserId: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          adminUser: {
            select: adminUserSelect,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      }),
    ])

    const byAdminIds = byAdminRows
      .map((row) => row.adminUserId)
      .filter((value): value is string => typeof value === 'string')
    const adminUsers = byAdminIds.length
      ? await this.prisma.adminUser.findMany({
          where: {
            id: {
              in: byAdminIds,
            },
          },
          select: adminUserSelect,
        })
      : []
    const adminUserById = new Map(adminUsers.map((user) => [user.id, user]))

    return {
      total,
      byAction: Object.fromEntries(byActionRows.map((row) => [row.action, row._count.action])),
      byEntityType: Object.fromEntries(
        byEntityTypeRows.map((row) => [row.entityType, row._count.entityType])
      ),
      byAdmin: byAdminRows
        .filter((row) => typeof row.adminUserId === 'string')
        .map((row) => ({
          adminUserId: row.adminUserId as string,
          adminUsername: adminUserById.get(row.adminUserId as string)?.username ?? 'Unknown',
          count: row._count.adminUserId,
        })),
      recentActivity,
    }
  }

  private buildWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {}

    if (filters.action) {
      where.action = Array.isArray(filters.action) ? { in: filters.action } : filters.action
    }

    if (filters.adminUserId) {
      where.adminUserId = filters.adminUserId
    }

    if (filters.entityType) {
      where.entityType = filters.entityType
    }

    if (filters.entityId) {
      where.entityId = filters.entityId
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    return where
  }
}

export const auditRepository = new AuditRepository()
