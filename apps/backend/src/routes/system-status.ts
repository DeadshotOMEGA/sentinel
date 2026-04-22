import { initServer } from '@ts-rest/express'
import type { SystemStatusResponse } from '@sentinel/contracts'
import { systemStatusContract } from '@sentinel/contracts'
import { getPrismaClient } from '../lib/database.js'
import { SystemStatusService } from '../services/system-status-service.js'

const s = initServer()
const systemStatusService = new SystemStatusService(getPrismaClient())

function toKioskSafeSystemStatus(status: SystemStatusResponse): SystemStatusResponse {
  return {
    ...status,
    database: {
      ...status.database,
      address: null,
    },
    network: {
      ...status.network,
      hostIpAddress: null,
      hotspotScanDevice: null,
      remoteTarget: null,
    },
    remoteSystems: {
      ...status.remoteSystems,
      activeCount: 0,
      overflowCount: 0,
      sessions: [],
    },
  }
}

export const systemStatusRouter = s.router(systemStatusContract, {
  getSystemStatus: async ({ req }) => {
    if (!req.member && !req.apiKey) {
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
        body: req.apiKey ? toKioskSafeSystemStatus(status) : status,
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
