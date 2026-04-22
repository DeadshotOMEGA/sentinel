import { initServer } from '@ts-rest/express'
import { auditContract, type AuditLogListQuery } from '@sentinel/contracts'
import { AccountLevel } from '../middleware/roles.js'
import { getPrismaClient } from '../lib/database.js'
import { AuditRepository, type AuditLogWithAdminRecord } from '../repositories/audit-repository.js'

const s = initServer()
const auditRepo = new AuditRepository(getPrismaClient())

function requireAdmin(req: { member?: { accountLevel?: number } }) {
  if (!req.member) {
    return {
      status: 401 as const,
      body: {
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }
  }

  if ((req.member.accountLevel ?? 0) < AccountLevel.ADMIN) {
    return {
      status: 403 as const,
      body: {
        error: 'FORBIDDEN',
        message: 'Admin access required',
      },
    }
  }

  return null
}

function toDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined
}

function toApiFormat(log: AuditLogWithAdminRecord) {
  return {
    id: log.id,
    adminUserId: log.adminUserId ?? null,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId ?? null,
    details:
      log.details && typeof log.details === 'object' && !Array.isArray(log.details)
        ? (log.details as Record<string, unknown>)
        : null,
    ipAddress: log.ipAddress ?? null,
    adminUser: log.adminUser
      ? {
          id: log.adminUser.id,
          username: log.adminUser.username,
          displayName: log.adminUser.displayName,
        }
      : null,
    createdAt: log.createdAt?.toISOString() ?? null,
  }
}

function getFilters(query: AuditLogListQuery) {
  return {
    adminUserId: query.adminUserId,
    entityType: query.entityType,
    entityId: query.entityId,
    action: query.action,
    startDate: toDate(query.startDate),
    endDate: toDate(query.endDate),
  }
}

export const auditLogsRouter = s.router(auditContract, {
  getAuditLogs: async ({ query, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const page = query.page ?? 1
      const limit = query.limit ?? 50
      const filters = getFilters(query)
      const [auditLogs, total] = await Promise.all([
        auditRepo.findAuditLogs(filters, { page, limit }),
        auditRepo.countAuditLogs(filters),
      ])

      return {
        status: 200 as const,
        body: {
          auditLogs: auditLogs.map((log) => toApiFormat(log)),
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch audit logs',
        },
      }
    }
  },

  getEntityAuditLogs: async ({ params, query, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const page = query.page ?? 1
      const limit = query.limit ?? 50
      const filters = {
        ...getFilters(query),
        entityType: params.entityType,
        entityId: params.entityId,
      }
      const [auditLogs, total] = await Promise.all([
        auditRepo.findAuditLogs(filters, { page, limit }),
        auditRepo.countAuditLogs(filters),
      ])

      return {
        status: 200 as const,
        body: {
          auditLogs: auditLogs.map((log) => toApiFormat(log)),
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch entity audit logs',
        },
      }
    }
  },

  getAuditStats: async ({ req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const stats = await auditRepo.getStats({})

      return {
        status: 200 as const,
        body: {
          total: stats.total,
          byAction: stats.byAction,
          byEntityType: stats.byEntityType,
          byAdmin: stats.byAdmin,
          recentActivity: stats.recentActivity.map((log) => toApiFormat(log)),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch audit stats',
        },
      }
    }
  },

  getAuditLogById: async ({ params, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const log = await auditRepo.findById(params.id)

      if (!log) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Audit log with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: toApiFormat(log),
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch audit log',
        },
      }
    }
  },

  createAuditLog: async ({ body, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const created = await auditRepo.log({
        adminUserId: null,
        action: body.action,
        entityType: body.entityType,
        entityId: body.entityId ?? null,
        details: body.details ?? {},
        ipAddress: body.ipAddress ?? req.ip ?? req.socket.remoteAddress ?? 'unknown',
      })

      return {
        status: 201 as const,
        body: toApiFormat(created),
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create audit log',
        },
      }
    }
  },
})
