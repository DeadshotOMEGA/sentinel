import { initServer } from '@ts-rest/express'
import type { Request } from 'express'
import { networkSettingContract } from '@sentinel/contracts'
import { getPrismaClient } from '../lib/database.js'
import { getRequestClientIp } from '../lib/runtime-context.js'
import { AccountLevel } from '../middleware/roles.js'
import { HostHotspotRecoveryService } from '../services/host-hotspot-recovery-service.js'
import { NetworkSettingsService } from '../services/network-settings-service.js'

const s = initServer()
const networkSettingsService = new NetworkSettingsService(getPrismaClient())

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

function requireAdmin(req: Request) {
  const auth = requireMember(req)
  if (auth) {
    return auth
  }

  if ((req.member?.accountLevel ?? 0) < AccountLevel.ADMIN) {
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

export const networkSettingsRouter = s.router(networkSettingContract, {
  getNetworkSettings: async ({ req }) => {
    const auth = requireMember(req)
    if (auth) {
      return auth
    }

    try {
      const state = await networkSettingsService.getNetworkSettings()

      return {
        status: 200 as const,
        body: state,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to load network settings',
        },
      }
    }
  },

  updateNetworkSettings: async ({ body, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const state = await networkSettingsService.updateNetworkSettings(body.settings)

      return {
        status: 200 as const,
        body: state,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update network settings',
        },
      }
    }
  },

  hostHotspotRecovery: async ({ req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const recoveryService = new HostHotspotRecoveryService()
      const userAgentHeader = req.headers['user-agent']
      await recoveryService.queueRecoveryRequest({
        requestedByMemberId: req.member?.id ?? 'unknown',
        requestedByMemberName:
          req.member !== undefined
            ? `${req.member.rank} ${req.member.firstName} ${req.member.lastName}`
            : 'Unknown member',
        requestedByRemoteSystemName: req.session?.remoteSystemName ?? null,
        requestedFromIp: getRequestClientIp(req),
        requestedFromUserAgent: Array.isArray(userAgentHeader)
          ? (userAgentHeader[0] ?? null)
          : (userAgentHeader ?? null),
      })

      return {
        status: 202 as const,
        body: {
          success: true,
          message: 'Host hotspot recovery request queued',
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to queue host hotspot recovery',
        },
      }
    }
  },
})
