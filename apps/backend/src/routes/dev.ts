import { initServer } from '@ts-rest/express'
import { devContract } from '@sentinel/contracts'
import type { MockScanRequest } from '@sentinel/contracts'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const prisma = getPrismaClient()

/**
 * Dev Mode routes
 *
 * Development and testing endpoints (disabled in production)
 * - Get all members with badge and presence info
 * - Clear all current check-ins
 * - Mock RFID badge scans
 */
export const devRouter = s.router(devContract, {
  /**
   * GET /api/dev/members - Get all active members with badge and presence
   */
  getMembers: async () => {
    try {
      // Block in production
      if (process.env.NODE_ENV === 'production') {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: 'Dev routes are disabled in production',
          },
        }
      }

      // Get all active members with badge info and presence status
      const members = await prisma.member.findMany({
        where: { status: 'active' },
        include: {
          division: {
            select: {
              id: true,
              name: true,
            },
          },
          badge: {
            select: {
              serialNumber: true,
            },
          },
          checkins: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 1,
          },
        },
        orderBy: [{ division: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
      })

      const membersWithPresence = members.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        rank: member.rank,
        division: member.division?.name ?? 'Unknown',
        divisionId: member.division?.id ?? 'Unknown',
        mess: member.mess || null,
        badgeSerialNumber: member.badge?.serialNumber || null,
        isPresent: member.checkins.length > 0 && member.checkins[0]?.direction === 'in',
      }))

      return {
        status: 200 as const,
        body: {
          members: membersWithPresence,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get members',
        },
      }
    }
  },

  /**
   * DELETE /api/dev/checkins/clear-all - Check out all currently present members
   */
  clearAllCheckins: async () => {
    try {
      // Block in production
      if (process.env.NODE_ENV === 'production') {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: 'Dev routes are disabled in production',
          },
        }
      }

      // Find all currently present members (latest checkin is 'in')
      const presentMembers = await prisma.member.findMany({
        where: {
          checkins: {
            some: {
              direction: 'in',
            },
          },
        },
        include: {
          checkins: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 1,
          },
        },
      })

      // Filter to only those whose latest checkin is 'in'
      const actuallyPresent = presentMembers.filter(
        (member) => member.checkins.length > 0 && member.checkins[0]?.direction === 'in'
      )

      if (actuallyPresent.length === 0) {
        return {
          status: 200 as const,
          body: {
            message: 'No one is currently checked in',
            clearedCount: 0,
          },
        }
      }

      // Create check-out records for all present members
      const now = new Date()
      await prisma.checkin.createMany({
        data: actuallyPresent.map((member) => ({
          memberId: member.id,
          badgeId: member.checkins[0]?.badgeId ?? null,
          direction: 'out' as const,
          timestamp: now,
          kioskId: 'dev-clear-all',
          synced: true,
        })),
      })

      // TODO: Broadcast presence update via WebSocket when websocket service is available
      // const stats = await checkinRepository.getPresenceStats()
      // broadcastPresenceUpdate(stats)

      return {
        status: 200 as const,
        body: {
          message: `Cleared ${actuallyPresent.length} check-in${actuallyPresent.length !== 1 ? 's' : ''}`,
          clearedCount: actuallyPresent.length,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to clear check-ins',
        },
      }
    }
  },

  /**
   * POST /api/dev/mock-scan - Simulate RFID badge scan
   */
  mockScan: async ({ body }) => {
    try {
      // Block in production
      if (process.env.NODE_ENV === 'production') {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: 'Dev routes are disabled in production',
          },
        }
      }

      const config: MockScanRequest = body

      // Find badge by serial number
      const badge = await prisma.badge.findUnique({
        where: { serialNumber: config.serialNumber },
        include: {
          members: {
            include: {
              division: {
                select: {
                  name: true,
                },
              },
              checkins: {
                orderBy: {
                  timestamp: 'desc',
                },
                take: 1,
              },
            },
            take: 1,
          },
        },
      })

      if (!badge) {
        return {
          status: 404 as const,
          body: {
            error: 'BADGE_NOT_FOUND',
            message: `Badge with serial number '${config.serialNumber}' not found`,
          },
        }
      }

      if (badge.status !== 'active') {
        return {
          status: 400 as const,
          body: {
            error: 'BADGE_INACTIVE',
            message: `Badge ${config.serialNumber} is ${badge.status}`,
          },
        }
      }

      if (!badge.members || badge.members.length === 0) {
        return {
          status: 400 as const,
          body: {
            error: 'BADGE_UNASSIGNED',
            message: `Badge ${config.serialNumber} is not assigned to any member`,
          },
        }
      }

      const member = badge.members[0]

      // Determine direction (toggle between in/out)
      const lastCheckin = member.checkins[0]
      const direction: 'in' | 'out' = !lastCheckin || lastCheckin.direction === 'out' ? 'in' : 'out'

      // Create checkin record
      const timestamp = config.timestamp ? new Date(config.timestamp) : new Date()
      const checkin = await prisma.checkin.create({
        data: {
          memberId: member.id,
          badgeId: badge.id,
          direction,
          timestamp,
          kioskId: config.kioskId || 'dev-mock-scanner',
          synced: true,
        },
      })

      // TODO: Broadcast to WebSocket when websocket service is available
      // broadcastPresenceUpdate(...)

      return {
        status: 200 as const,
        body: {
          success: true,
          direction,
          member: {
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            rank: member.rank,
            division: member.division.name,
          },
          timestamp: checkin.timestamp.toISOString(),
          message: `${member.firstName} ${member.lastName} checked ${direction}`,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process mock scan',
        },
      }
    }
  },
})
