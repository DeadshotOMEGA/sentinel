import { initServer } from '@ts-rest/express'
import { checkinContract } from '@sentinel/contracts'
import type {
  CheckinListQuery,
  CreateCheckinInput,
  BulkCreateCheckinsInput,
  UpdateCheckinInput,
  RecentActivityQuery,
  IdParam,
} from '@sentinel/contracts'
import type { Request } from 'express'
import { CheckinRepository } from '../repositories/checkin-repository.js'
import { VisitorRepository } from '../repositories/visitor-repository.js'
import { AuditRepository } from '../repositories/audit-repository.js'
import { PresenceService } from '../services/presence-service.js'
import { LockupService } from '../services/lockup-service.js'
import { DdsService } from '../services/dds-service.js'
import { getPrismaClient } from '../lib/database.js'
import { broadcastCheckin } from '../websocket/broadcast.js'
import { serviceLogger } from '../lib/logger.js'
import { AccountLevel } from '../middleware/roles.js'

function getClientIp(req: unknown): string {
  const r = req as { ip?: string; socket?: { remoteAddress?: string } }
  return r.ip || r.socket?.remoteAddress || 'unknown'
}

const s = initServer()

const checkinRepo = new CheckinRepository(getPrismaClient())
const visitorRepo = new VisitorRepository(getPrismaClient())
const presenceService = new PresenceService(getPrismaClient())
const auditRepo = new AuditRepository(getPrismaClient())

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

      // If filtering by memberId, only show member checkins (no visitors)
      if (query.memberId) {
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
              type: 'member' as const,
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
      }

      // Unified query: members + visitors merged and sorted by timestamp
      const visitorFilters: Record<string, unknown> = {}
      if (query.kioskId) visitorFilters.kioskId = query.kioskId
      if (query.startDate && query.endDate) {
        visitorFilters.dateRange = {
          start: new Date(query.startDate),
          end: new Date(query.endDate),
        }
      }

      const [memberResult, visitors] = await Promise.all([
        checkinRepo.findAllWithMembers(filters),
        visitorRepo.findAll(visitorFilters as { dateRange?: { start: Date; end: Date }; visitType?: string; hostMemberId?: string }),
      ])

      // Unified checkin entry type for merging members and visitors
      interface UnifiedCheckinEntry {
        id: string
        memberId: string | null
        badgeId: string | null
        direction: string
        timestamp: string
        kioskId: string
        synced: boolean | null
        flaggedForReview: null
        flagReason: null
        method: string | null
        type: 'member' | 'visitor'
        visitorName?: string
        visitorOrganization?: string
        member: {
          id: string
          serviceNumber: string
          rank: string
          firstName: string
          lastName: string
          divisionId: string
        } | null
      }

      // Convert member checkins to unified format
      const memberEntries: UnifiedCheckinEntry[] = memberResult.checkins.map((checkin) => ({
        id: checkin.id,
        memberId: checkin.memberId ?? null,
        badgeId: checkin.badgeId ?? null,
        direction: checkin.direction,
        timestamp: checkin.timestamp.toISOString(),
        kioskId: checkin.kioskId,
        synced: checkin.synced ?? null,
        flaggedForReview: null as null,
        flagReason: null as null,
        method: checkin.method ?? null,
        type: 'member' as const,
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
      }))

      // Convert visitors to unified entries (each visitor produces 1-2 rows)
      const visitorEntries: UnifiedCheckinEntry[] = []
      for (const v of visitors) {
        // Check-in entry
        visitorEntries.push({
          id: `v-in-${v.id}`,
          memberId: null,
          badgeId: null,
          direction: 'in',
          timestamp: v.checkInTime.toISOString(),
          kioskId: v.kioskId,
          synced: null,
          flaggedForReview: null,
          flagReason: null,
          method: v.checkInMethod ?? null,
          type: 'visitor' as const,
          visitorName: v.name,
          visitorOrganization: v.organization,
          member: null,
        })

        // Check-out entry (only if checked out)
        if (v.checkOutTime) {
          visitorEntries.push({
            id: `v-out-${v.id}`,
            memberId: null,
            badgeId: null,
            direction: 'out',
            timestamp: v.checkOutTime.toISOString(),
            kioskId: v.kioskId,
            synced: null,
            flaggedForReview: null,
            flagReason: null,
            method: v.checkInMethod ?? null,
            type: 'visitor' as const,
            visitorName: v.name,
            visitorOrganization: v.organization,
            member: null,
          })
        }
      }

      // Merge and sort by timestamp descending
      const allEntries = [...memberEntries, ...visitorEntries]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      const total = allEntries.length
      const totalPages = Math.ceil(total / limit)
      const startIndex = (page - 1) * limit
      const paginatedEntries = allEntries.slice(startIndex, startIndex + limit)

      return {
        status: 200 as const,
        body: {
          checkins: paginatedEntries,
          total,
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
   * Get recent activity (checkins + visitor sign-ins)
   */
  getRecentActivity: async ({ query }: { query: RecentActivityQuery }) => {
    try {
      const limit = query.limit ? Number(query.limit) : 20
      const activities = await presenceService.getRecentActivity(limit)

      return {
        status: 200 as const,
        body: {
          activities,
          total: activities.length,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch recent activity',
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
   * Update existing checkin — Admin/Developer only, fully audited
   */
  updateCheckin: async ({
    params,
    body,
    req,
  }: {
    params: IdParam
    body: UpdateCheckinInput
    req: Request
  }) => {
    // Enforce Admin+ access
    if ((req.member?.accountLevel ?? 0) < AccountLevel.ADMIN) {
      return {
        status: 403 as const,
        body: {
          error: 'FORBIDDEN',
          message: 'Editing check-in records requires Admin or Developer access',
        },
      }
    }

    try {
      // Snapshot before update — use raw findUnique so we get the record even if memberId is null
      const before = await getPrismaClient().checkin.findUnique({
        where: { id: params.id },
        select: { id: true, direction: true, timestamp: true, memberId: true },
      })
      if (!before) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Checkin with ID '${params.id}' not found`,
          },
        }
      }

      const updated = await checkinRepo.update(params.id, {
        direction: body.direction,
        timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
      })

      // Fetch with member details for response
      const checkinWithMember = await checkinRepo.findByIdWithMember(updated.id)
      if (!checkinWithMember) {
        throw new Error('Failed to fetch updated checkin')
      }

      // Record exactly what changed, who changed it, and why
      const changes: Record<string, { before: unknown; after: unknown }> = {}
      if (body.direction !== undefined && body.direction !== before.direction) {
        changes.direction = { before: before.direction, after: body.direction }
      }
      if (body.timestamp !== undefined) {
        const beforeTs = before.timestamp.toISOString()
        const afterTs = new Date(body.timestamp).toISOString()
        if (beforeTs !== afterTs) {
          changes.timestamp = { before: beforeTs, after: afterTs }
        }
      }

      await auditRepo.log({
        adminUserId: null, // member sessions use members table, not admin_users — store identity in details
        action: 'checkin_update',
        entityType: 'checkin',
        entityId: params.id,
        details: {
          editReason: body.editReason ?? null,
          editorMemberId: req.member?.id ?? null,
          editorName: req.member
            ? `${req.member.rank} ${req.member.firstName} ${req.member.lastName}`
            : 'Unknown',
          changes,
          subjectMemberId: before.memberId ?? null,
        },
        ipAddress: getClientIp(req),
      })

      serviceLogger.info('Checkin updated by admin', {
        checkinId: params.id,
        editorId: req.member?.id,
        changes,
      })

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
   * Delete checkin — Admin/Developer only, fully audited
   */
  deleteCheckin: async ({
    params,
    req,
  }: {
    params: IdParam
    req: Request
  }) => {
    // Enforce Admin+ access
    if ((req.member?.accountLevel ?? 0) < AccountLevel.ADMIN) {
      return {
        status: 403 as const,
        body: {
          error: 'FORBIDDEN',
          message: 'Deleting check-in records requires Admin or Developer access',
        },
      }
    }

    try {
      // Snapshot before delete — use raw findUnique so we get the record even if memberId is null
      const before = await getPrismaClient().checkin.findUnique({
        where: { id: params.id },
        select: { id: true, direction: true, timestamp: true, kioskId: true, memberId: true, method: true },
      })
      if (!before) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Checkin with ID '${params.id}' not found`,
          },
        }
      }

      await checkinRepo.delete(params.id)

      await auditRepo.log({
        adminUserId: null, // member sessions use members table, not admin_users — store identity in details
        action: 'checkin_delete',
        entityType: 'checkin',
        entityId: params.id,
        details: {
          editorMemberId: req.member?.id ?? null,
          editorName: req.member
            ? `${req.member.rank} ${req.member.firstName} ${req.member.lastName}`
            : 'Unknown',
          deletedRecord: {
            direction: before.direction,
            timestamp: before.timestamp.toISOString(),
            kioskId: before.kioskId,
            memberId: before.memberId ?? null,
            method: before.method ?? null,
          },
        },
        ipAddress: getClientIp(req),
      })

      serviceLogger.info('Checkin deleted by admin', {
        checkinId: params.id,
        editorId: req.member?.id,
      })

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
