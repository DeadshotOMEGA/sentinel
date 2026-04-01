import { initServer } from '@ts-rest/express'
import { systemStatusContract } from '@sentinel/contracts'
import { getPrismaClient } from '../lib/database.js'
import { SystemStatusService } from '../services/system-status-service.js'

const s = initServer()
const systemStatusService = new SystemStatusService(getPrismaClient())

export const systemStatusRouter = s.router(systemStatusContract, {
  getSystemStatus: async ({ req }) => {
    if (!req.member) {
      return {
        status: 401 as const,
        body: {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }
    }

    try {
      const status = await systemStatusService.getSystemStatus()

      return {
        status: 200 as const,
        body: status,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to load system status',
        },
      }
    }
  },
})
