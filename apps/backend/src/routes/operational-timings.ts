import { initServer } from '@ts-rest/express'
import { operationalTimingContract } from '@sentinel/contracts'
import * as v from 'valibot'
import { OperationalTimingsSettingsSchema } from '@sentinel/contracts'
import type { Request } from 'express'
import { logRequestAudit } from '../lib/audit-log.js'
import { requireAccessRule } from '../lib/access-rule-auth.js'
import { AuditRepository } from '../repositories/audit-repository.js'
import { OperationalTimingsService } from '../services/operational-timings-service.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const operationalTimingsService = new OperationalTimingsService(getPrismaClient())
const auditRepo = new AuditRepository(getPrismaClient())

function requireMember(req: Request) {
  if (!req.member) {
    return {
      status: 401 as const,
      body: {
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }
  }
  return null
}

export const operationalTimingsRouter = s.router(operationalTimingContract, {
  getOperationalTimings: async ({ req }) => {
    const auth = requireMember(req)
    if (auth) {
      return auth
    }

    try {
      const settings = await operationalTimingsService.getOperationalTimings()
      return {
        status: 200 as const,
        body: settings,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch operational timings',
        },
      }
    }
  },

  updateOperationalTimings: async ({ req, body }) => {
    const auth = await requireAccessRule(req, 'config.timing.manage')
    if (auth) {
      return auth
    }

    const parsed = v.safeParse(OperationalTimingsSettingsSchema, body.settings)
    if (!parsed.success) {
      const firstIssue = parsed.issues[0]
      return {
        status: 400 as const,
        body: {
          error: 'VALIDATION_ERROR',
          message: firstIssue.message,
        },
      }
    }

    try {
      const previousSettings = await operationalTimingsService.getOperationalTimings()
      const updated = await operationalTimingsService.updateOperationalTimings(parsed.output)

      await logRequestAudit(auditRepo, req, {
        action: 'operational_timings_update',
        entityType: 'operational_timings',
        entityId: null,
        details: {
          previousSettings: previousSettings.settings,
          nextSettings: updated.settings,
        },
      })

      return {
        status: 200 as const,
        body: updated,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update operational timings',
        },
      }
    }
  },
})
