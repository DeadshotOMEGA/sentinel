import { initServer } from '@ts-rest/express'
import type { SystemStatusResponse } from '@sentinel/contracts'
import { systemStatusContract } from '@sentinel/contracts'
import { getPrismaClient } from '../lib/database.js'
import { SystemStatusService } from '../services/system-status-service.js'
import { broadcastSystemRefreshRequired } from '../websocket/broadcast.js'

const s = initServer()
const systemStatusService = new SystemStatusService(getPrismaClient())
const automatedHotspotRecoverySources = new Set(['host-hotspot-monitor', 'backend-scheduler'])
const broadcastedRecoveredRequests = new Set<string>()

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
      hotspotDevice: null,
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

function maybeBroadcastRecoveredHotspot(status: SystemStatusResponse): void {
  const recoveryStatus = status.network.hostHotspotRecovery
  const requestId = recoveryStatus?.requestId
  const source = recoveryStatus?.source

  if (
    !recoveryStatus ||
    recoveryStatus.state !== 'completed' ||
    status.network.issueCode !== 'none' ||
    !source ||
    !automatedHotspotRecoverySources.has(source)
  ) {
    return
  }

  const broadcastKey = requestId ?? `${source}:${recoveryStatus.updatedAt}`
  if (broadcastedRecoveredRequests.has(broadcastKey)) {
    return
  }

  broadcastedRecoveredRequests.add(broadcastKey)
  broadcastSystemRefreshRequired({
    reason: 'host_hotspot_recovered',
    requestId: requestId ?? null,
    message: 'Sentinel hotspot recovery completed. Refreshing connected pages.',
    timestamp: new Date().toISOString(),
  })
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
      maybeBroadcastRecoveredHotspot(status)

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
