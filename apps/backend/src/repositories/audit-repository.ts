import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma, Prisma } from '@sentinel/database'
import type { AuditLog as PrismaAuditLog } from '@sentinel/database'

export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
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

interface AuditLogEntry {
  adminUserId: string | null
  action: AuditAction
  entityType: string
  entityId: string | null
  details: Record<string, unknown>
  ipAddress: string
}

interface AuditLogFilters {
  action?: AuditAction | AuditAction[]
  actorId?: string
  entityId?: string
  startDate?: Date
  endDate?: Date
}

export class AuditRepository {
  private prisma: PrismaClientInstance

  /**
   * @param prismaClient - Optional Prisma client (injected in tests)
   */
  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        adminUserId: entry.adminUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details as Prisma.JsonObject,
        ipAddress: entry.ipAddress,
      },
    })
  }

  /**
   * Find audit logs for user management actions with pagination and filtering
   */
  async findUserAuditLogs(
    filters: AuditLogFilters,
    pagination: { page: number; limit: number }
  ): Promise<PrismaAuditLog[]> {
    const where: Prisma.AuditLogWhereInput = {}

    if (filters.action) {
      where.action = Array.isArray(filters.action) ? { in: filters.action } : filters.action
    }

    if (filters.actorId) {
      where.adminUserId = filters.actorId
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

    const logs = await this.prisma.auditLog.findMany({
      where,
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
  async countUserAuditLogs(filters: AuditLogFilters): Promise<number> {
    const where: Prisma.AuditLogWhereInput = {}

    if (filters.action) {
      where.action = Array.isArray(filters.action) ? { in: filters.action } : filters.action
    }

    if (filters.actorId) {
      where.adminUserId = filters.actorId
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

    return await this.prisma.auditLog.count({ where })
  }
}

export const auditRepository = new AuditRepository()
