import { initServer } from '@ts-rest/express'
import { adminNavigationContract } from '@sentinel/contracts'
import type { Request } from 'express'
import { requireAccessRule } from '../lib/access-rule-auth.js'
import { recordAdminNavigationEvent } from '../lib/metrics.js'

const s = initServer()

export const adminNavigationEventsRouter = s.router(adminNavigationContract, {
  recordAdminNavigationEvent: async ({ body, req }) => {
    const auth = await requireAccessRule(req as Request, 'admin.view')
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
