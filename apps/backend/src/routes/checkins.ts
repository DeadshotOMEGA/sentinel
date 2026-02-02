import { initServer } from '@ts-rest/express'
import { checkinContract } from '@sentinel/contracts'
import type {
  CheckinListQuery,
  CreateCheckinInput,
  BulkCreateCheckinsInput,
  UpdateCheckinInput,
  IdParam,
} from '@sentinel/contracts'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { PresenceService } from '../services/presence-service.js'
import { LockupService } from '../services/lockup-service.js'
import { DdsService } from '../services/dds-service.js'
import { getPrismaClient } from '../lib/database.js'
import { broadcastCheckin } from '../websocket/broadcast.js'
import { serviceLogger } from '../lib/logger.js'

const s = initServer()

const checkinRepo = new CheckinRepository(getPrismaClient())
const presenceService = new PresenceService(getPrismaClient())

/**
 * Checkins route implementation using ts-rest
 */
export const checkinsRouter = s.router(checkinContract, {
  /**
   * Get all checkins with pagination and filtering
   */
  getCheckins: async ({ query }: { query: CheckinListQuery }) => {
    try {
      const page = query.page ? Number(query.page) : 1
      const limit = query.limit ? Number(query.limit) : 50

      // Build filters from query parameters
      const filters: Record<string, unknown> = {}
      if (query.memberId) filters.memberId = query.memberId
      if (query.kioskId) filters.kioskId = query.kioskId
      if (query.startDate && query.endDate) {
        filters.dateRange = {
          start: new Date(query.startDate),
          end: new Date(query.endDate),
        }
      }

      const result = await checkinRepo.findPaginatedWithMembers({ page, limit }, filters)

      const totalPages = Math.ceil(result.total / limit)

      return {
        status: 200 as const,
        body: {
          checkins: result.checkins.map((checkin) => ({
            id: checkin.id,
            memberId: checkin.memberId ?? null,
            badgeId: checkin.badgeId ?? null,
            direction: checkin.direction,
            timestamp: checkin.timestamp.toISOString(),
            kioskId: checkin.kioskId,
            synced: checkin.synced ?? null,
            flaggedForReview: null,
            flagReason: null,
            method: checkin.method ?? null,
            member: checkin.member
              ? {
                  id: checkin.member.id,
                  serviceNumber: checkin.member.serviceNumber,
                  rank: checkin.member.rank,
                  firstName: checkin.member.firstName,
                  lastName: checkin.member.lastName,
                  divisionId: checkin.member.divisionId,
                }
              : null,
          })),
          total: result.total,
          page,
          limit,
          totalPages,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch checkins',
        },
      }
    }
  },

  /**
   * Get current presence status
   */
  getPresenceStatus: async () => {
    try {
      const stats = await checkinRepo.getPresenceStats()

      // Get division breakdown from database
      const divisions = await getPrismaClient().$queryRaw<
        Array<{
          division_id: string
          division_name: string
          present: bigint
          total: bigint
        }>
      >`
        WITH latest_checkins AS (
          SELECT DISTINCT ON (member_id)
            member_id,
            direction
          FROM checkins
          ORDER BY member_id, timestamp DESC
        )
        SELECT
          d.id as division_id,
          d.name as division_name,
          COUNT(*) FILTER (WHERE m.status = 'active' AND lc.direction = 'in') as present,
          COUNT(*) FILTER (WHERE m.status = 'active') as total
        FROM divisions d
        LEFT JOIN members m ON m.division_id = d.id
        LEFT JOIN latest_checkins lc ON m.id = lc.member_id
        GROUP BY d.id, d.name
        ORDER BY d.name
      `

      return {
        status: 200 as const,
        body: {
          totalPresent: stats.present,
          totalMembers: stats.totalMembers,
          byDivision: divisions.map((d) => ({
            divisionId: d.division_id,
            divisionName: d.division_name,
            present: Number(d.present),
            total: Number(d.total),
          })),
          lastUpdated: new Date().toISOString(),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch presence status',
        },
      }
    }
  },

  /**
   * Get all present people (members + visitors)
   */
  getPresentPeople: async () => {
    try {
      const people = await presenceService.getAllPresentPeople()

      return {
        status: 200 as const,
        body: {
          people: people.map((p) => ({
            id: p.id,
            type: p.type,
            name: p.name,
            rank: p.rank,
            rankSortOrder: p.rankSortOrder,
            division: p.division,
            divisionId: p.divisionId,
            memberType: p.memberType,
            tags: p.tags,
            organization: p.organization,
            visitType: p.visitType,
            visitReason: p.visitReason,
            hostMemberId: p.hostMemberId,
            hostName: p.hostName,
            eventId: p.eventId,
            eventName: p.eventName,
            checkInTime: p.checkInTime.toISOString(),
            kioskId: p.kioskId,
            kioskName: p.kioskName,
            alerts: p.alerts,
          })),
          total: people.length,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch present people',
        },
      }
    }
  },

  /**
   * Get single checkin by ID
   */
  getCheckinById: async ({ params }: { params: IdParam }) => {
    try {
      const checkin = await checkinRepo.findByIdWithMember(params.id)

      if (!checkin) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Checkin with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          id: checkin.id,
          memberId: checkin.memberId ?? null,
          badgeId: checkin.badgeId ?? null,
          direction: checkin.direction,
          timestamp: checkin.timestamp.toISOString(),
          kioskId: checkin.kioskId,
          synced: checkin.synced ?? null,
          flaggedForReview: null,
          flagReason: null,
          method: checkin.method ?? null,
          member: checkin.member
            ? {
                id: checkin.member.id,
                serviceNumber: checkin.member.serviceNumber,
                rank: checkin.member.rank,
                firstName: checkin.member.firstName,
                lastName: checkin.member.lastName,
                divisionId: checkin.member.divisionId,
              }
            : null,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch checkin',
        },
      }
    }
  },

  /**
   * Create new checkin
   */
  createCheckin: async ({ body }: { body: CreateCheckinInput }) => {
    try {
      // Block checkout if member holds lockup responsibility
      if (body.direction === 'out' && body.memberId) {
        const lockupService = new LockupService(getPrismaClient())
        const checkoutOptions = await lockupService.getCheckoutOptions(body.memberId)

        if (!checkoutOptions.canCheckout) {
          return {
            status: 403 as const,
            body: {
              error: 'LOCKUP_HELD',
              message: checkoutOptions.blockReason ?? 'You must transfer or execute lockup before checking out',
              details: {
                holdsLockup: checkoutOptions.holdsLockup,
                availableOptions: checkoutOptions.availableOptions,
                eligibleRecipients: checkoutOptions.eligibleRecipients ?? [],
              },
            },
          }
        }
      }

      const checkin = await checkinRepo.create({
        memberId: body.memberId,
        badgeId: body.badgeId,
        direction: body.direction,
        kioskId: body.kioskId,
        method: body.method,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        synced: true,
      })

      // DDS check-in gating: auto-accept DDS when building is secured
      // Runs after check-in creation so the member is present for lockup acquisition
      if (body.direction === 'in' && body.memberId) {
        try {
          const ddsService = new DdsService(getPrismaClient())
          const lockupService = new LockupService(getPrismaClient())
          const currentDds = await ddsService.getCurrentDds()

          if (currentDds && currentDds.memberId === body.memberId) {
            const lockupStatus = await lockupService.getCurrentStatus()
            if (lockupStatus.buildingStatus === 'secured') {
              try {
                await ddsService.acceptDds(body.memberId)
                serviceLogger.info('DDS auto-accepted on check-in', { memberId: body.memberId })
              } catch (acceptError) {
                serviceLogger.warn('DDS acceptance failed during check-in (non-blocking)', {
                  memberId: body.memberId,
                  error: acceptError instanceof Error ? acceptError.message : String(acceptError),
                })
              }
            }
          }
        } catch (ddsError) {
          serviceLogger.warn('DDS gating lookup failed during check-in (non-blocking)', {
            memberId: body.memberId,
            error: ddsError instanceof Error ? ddsError.message : String(ddsError),
          })
        }
      }

      // Fetch with member details for response
      const checkinWithMember = await checkinRepo.findByIdWithMember(checkin.id)

      if (!checkinWithMember) {
        throw new Error('Failed to fetch created checkin')
      }

      // Broadcast checkin event for real-time updates
      broadcastCheckin({
        id: checkinWithMember.id,
        memberId: checkinWithMember.memberId ?? null,
        memberName: checkinWithMember.member
          ? `${checkinWithMember.member.firstName} ${checkinWithMember.member.lastName}`
          : undefined,
        rank: checkinWithMember.member?.rank,
        direction: checkinWithMember.direction as 'in' | 'out',
        timestamp: checkinWithMember.timestamp.toISOString(),
        kioskId: checkinWithMember.kioskId,
      })

      // Fire-and-forget presence stats broadcast
      presenceService.broadcastStatsUpdate().catch((err) => {
        serviceLogger.warn('Presence stats broadcast failed (non-blocking)', {
          error: err instanceof Error ? err.message : String(err),
        })
      })

      return {
        status: 201 as const,
        body: {
          id: checkinWithMember.id,
          memberId: checkinWithMember.memberId ?? null,
          badgeId: checkinWithMember.badgeId ?? null,
          direction: checkinWithMember.direction,
          timestamp: checkinWithMember.timestamp.toISOString(),
          kioskId: checkinWithMember.kioskId,
          synced: checkinWithMember.synced ?? null,
          flaggedForReview: null,
          flagReason: null,
          method: checkinWithMember.method ?? null,
          member: checkinWithMember.member
            ? {
                id: checkinWithMember.member.id,
                serviceNumber: checkinWithMember.member.serviceNumber,
                rank: checkinWithMember.member.rank,
                firstName: checkinWithMember.member.firstName,
                lastName: checkinWithMember.member.lastName,
                divisionId: checkinWithMember.member.divisionId,
              }
            : null,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }

      // Handle Prisma FK constraint violations (P2003)
      if (error instanceof Error && error.message.includes('Foreign key constraint')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: 'Member not found',
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create checkin',
        },
      }
    }
  },

  /**
   * Bulk create checkins (for offline sync)
   */
  bulkCreateCheckins: async ({ body }: { body: BulkCreateCheckinsInput }) => {
    try {
      const checkins = body.checkins.map((c) => ({
        memberId: c.memberId,
        badgeId: c.badgeId,
        direction: c.direction,
        kioskId: c.kioskId,
        timestamp: c.timestamp ? new Date(c.timestamp) : new Date(),
        synced: true,
      }))

      const result = await checkinRepo.bulkCreate(checkins)

      return {
        status: 201 as const,
        body: {
          success: result.success,
          failed: result.failed,
          errors: result.errors.map((e) => ({
            index: e.index,
            error: e.error,
          })),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to bulk create checkins',
        },
      }
    }
  },

  /**
   * Update existing checkin
   */
  updateCheckin: async ({ params, body }: { params: IdParam; body: UpdateCheckinInput }) => {
    try {
      const updated = await checkinRepo.update(params.id, {
        direction: body.direction,
      })

      // Fetch with member details for response
      const checkinWithMember = await checkinRepo.findByIdWithMember(updated.id)

      if (!checkinWithMember) {
        throw new Error('Failed to fetch updated checkin')
      }

      return {
        status: 200 as const,
        body: {
          id: checkinWithMember.id,
          memberId: checkinWithMember.memberId ?? null,
          badgeId: checkinWithMember.badgeId ?? null,
          direction: checkinWithMember.direction,
          timestamp: checkinWithMember.timestamp.toISOString(),
          kioskId: checkinWithMember.kioskId,
          synced: checkinWithMember.synced ?? null,
          flaggedForReview: null,
          flagReason: null,
          method: checkinWithMember.method ?? null,
          member: checkinWithMember.member
            ? {
                id: checkinWithMember.member.id,
                serviceNumber: checkinWithMember.member.serviceNumber,
                rank: checkinWithMember.member.rank,
                firstName: checkinWithMember.member.firstName,
                lastName: checkinWithMember.member.lastName,
                divisionId: checkinWithMember.member.divisionId,
              }
            : null,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Checkin with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update checkin',
        },
      }
    }
  },

  /**
   * Delete checkin
   */
  deleteCheckin: async ({ params }: { params: IdParam }) => {
    try {
      await checkinRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Checkin deleted successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Checkin with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete checkin',
        },
      }
    }
  },

  /**
   * Get checkins for a specific member
   */
  getMemberCheckins: async ({ params, query }: { params: IdParam; query: CheckinListQuery }) => {
    try {
      const page = query.page ? Number(query.page) : 1
      const limit = query.limit ? Number(query.limit) : 50

      // Build filters from query parameters
      const filters: Record<string, unknown> = {
        memberId: params.id,
      }
      if (query.kioskId) filters.kioskId = query.kioskId
      if (query.startDate && query.endDate) {
        filters.dateRange = {
          start: new Date(query.startDate),
          end: new Date(query.endDate),
        }
      }

      const result = await checkinRepo.findPaginatedWithMembers({ page, limit }, filters)

      const totalPages = Math.ceil(result.total / limit)

      return {
        status: 200 as const,
        body: {
          checkins: result.checkins.map((checkin) => ({
            id: checkin.id,
            memberId: checkin.memberId ?? null,
            badgeId: checkin.badgeId ?? null,
            direction: checkin.direction,
            timestamp: checkin.timestamp.toISOString(),
            kioskId: checkin.kioskId,
            synced: checkin.synced ?? null,
            flaggedForReview: null,
            flagReason: null,
            method: checkin.method ?? null,
            member: checkin.member
              ? {
                  id: checkin.member.id,
                  serviceNumber: checkin.member.serviceNumber,
                  rank: checkin.member.rank,
                  firstName: checkin.member.firstName,
                  lastName: checkin.member.lastName,
                  divisionId: checkin.member.divisionId,
                }
              : null,
          })),
          total: result.total,
          page,
          limit,
          totalPages,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch member checkins',
        },
      }
    }
  },
})
