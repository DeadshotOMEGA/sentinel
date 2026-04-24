import { initServer } from '@ts-rest/express'
import { adminNavigationContract } from '@sentinel/contracts'
import { AccountLevel } from '../middleware/roles.js'
import { recordAdminNavigationEvent } from '../lib/metrics.js'

const s = initServer()

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

export const adminNavigationEventsRouter = s.router(adminNavigationContract, {
  recordAdminNavigationEvent: async ({ body, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      recordAdminNavigationEvent({
        eventType: body.eventType,
        routeId: body.routeId,
        targetRouteId: body.targetRouteId,
        actionId: body.actionId,
        sourceType: body.sourceType,
        elapsedMs: body.elapsedMs,
      })

      return {
        status: 201 as const,
        body: {
          success: true,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to record admin navigation event',
        },
      }
    }
  },
})
