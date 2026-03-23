import { initServer } from '@ts-rest/express'
import { operationalTimingContract } from '@sentinel/contracts'
import * as v from 'valibot'
import { OperationalTimingsSettingsSchema } from '@sentinel/contracts'
import type { Request } from 'express'
import { AccountLevel } from '../middleware/roles.js'
import { OperationalTimingsService } from '../services/operational-timings-service.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const operationalTimingsService = new OperationalTimingsService(getPrismaClient())

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

function requireAdminOrDeveloper(req: Request) {
  const auth = requireMember(req)
  if (auth) {
    return auth
  }

  if ((req.member?.accountLevel ?? 0) < AccountLevel.ADMIN) {
    return {
      status: 403 as const,
      body: {
        error: 'FORBIDDEN',
        message: 'Admin or Developer access required',
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
    const auth = requireAdminOrDeveloper(req)
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
      const updated = await operationalTimingsService.updateOperationalTimings(parsed.output)
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
