import { initServer } from '@ts-rest/express'
import { visitorContract } from '@sentinel/contracts'
import type {
  VisitorListQuery,
  CreateVisitorInput,
  UpdateVisitorInput,
  IdParam,
} from '@sentinel/contracts'
import type { Visitor } from '@sentinel/types'
import { VisitorRepository } from '../repositories/visitor-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { broadcastVisitorSignin, broadcastVisitorSignout } from '../websocket/broadcast.js'

const s = initServer()

const visitorRepo = new VisitorRepository(getPrismaClient())

function toVisitorResponse(v: Visitor) {
  return {
    id: v.id,
    name: v.name,
    rankPrefix: v.rankPrefix ?? null,
    firstName: v.firstName ?? null,
    lastName: v.lastName ?? null,
    displayName: v.displayName ?? v.name,
    organization: v.organization ?? null,
    visitType: v.visitType as 'contractor' | 'guest' | 'official' | 'other',
    visitTypeId: v.visitTypeId ?? null,
    visitReason: v.visitReason ?? null,
    eventId: v.eventId ?? null,
    hostMemberId: v.hostMemberId ?? null,
    checkInTime: v.checkInTime.toISOString(),
    checkOutTime: v.checkOutTime?.toISOString() ?? null,
    temporaryBadgeId: v.temporaryBadgeId ?? null,
    kioskId: v.kioskId,
    adminNotes: v.adminNotes ?? null,
    checkInMethod: (v.checkInMethod || 'kiosk') as 'kiosk' | 'admin_manual',
    createdByAdmin: v.createdByAdmin ?? null,
    createdAt: v.createdAt.toISOString(),
  }
}

/**
 * Visitors route implementation using ts-rest
 */
export const visitorsRouter = s.router(visitorContract, {
  /**
   * Get active visitors
   */
  getActiveVisitors: async () => {
    try {
      const visitors = await visitorRepo.findActive()

      return {
        status: 200 as const,
        body: {
          visitors: visitors.map(toVisitorResponse),
          count: visitors.length,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch active visitors',
        },
      }
    }
  },

  /**
   * Get all visitors with pagination and filtering
   */
  getVisitors: async ({ query }: { query: VisitorListQuery }) => {
    try {
      const page = query.page || 1
      const limit = query.limit || 50

      const filters: Record<string, unknown> = {}
      if (query.startDate && query.endDate) {
        filters.dateRange = {
          start: new Date(query.startDate),
          end: new Date(query.endDate),
        }
      }
      if (query.visitType) filters.visitType = query.visitType
      if (query.hostMemberId) filters.hostMemberId = query.hostMemberId

      const allVisitors = await visitorRepo.findAll(filters)

      // Paginate
      const total = allVisitors.length
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedVisitors = allVisitors.slice(startIndex, endIndex)

      const totalPages = Math.ceil(total / limit)

      return {
        status: 200 as const,
        body: {
          visitors: paginatedVisitors.map(toVisitorResponse),
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
          message: error instanceof Error ? error.message : 'Failed to fetch visitors',
        },
      }
    }
  },

  /**
   * Create new visitor
   */
  createVisitor: async ({ body }: { body: CreateVisitorInput }) => {
    try {
      const hasStructuredName = Boolean(body.firstName?.trim() && body.lastName?.trim())
      const hasLegacyName = Boolean(body.name?.trim())
      if (!hasStructuredName && !hasLegacyName) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: 'Visitor must include first and last name, or a legacy name value',
          },
        }
      }

      const visitor = await visitorRepo.create({
        name: body.name,
        rankPrefix: body.rankPrefix,
        firstName: body.firstName,
        lastName: body.lastName,
        organization: body.organization,
        visitType: body.visitType,
        visitTypeId: body.visitTypeId,
        visitReason: body.visitReason,
        eventId: body.eventId,
        hostMemberId: body.hostMemberId,
        checkInTime: body.checkInTime ? new Date(body.checkInTime) : undefined,
        checkOutTime: body.checkOutTime ? new Date(body.checkOutTime) : undefined,
        temporaryBadgeId: body.temporaryBadgeId,
        kioskId: body.kioskId,
        adminNotes: body.adminNotes,
        checkInMethod: body.checkInMethod,
        createdByAdmin: body.createdByAdmin,
      })

      // Broadcast visitor sign-in
      broadcastVisitorSignin({
        id: visitor.id,
        name: visitor.displayName ?? visitor.name,
        organization: visitor.organization ?? 'N/A',
        visitType: visitor.visitType,
        checkInTime: visitor.checkInTime.toISOString(),
        hostName: undefined,
      })

      return {
        status: 201 as const,
        body: toVisitorResponse(visitor),
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create visitor',
        },
      }
    }
  },

  /**
   * Checkout visitor
   */
  checkoutVisitor: async ({ params }: { params: IdParam }) => {
    try {
      const visitor = await visitorRepo.checkout(params.id)

      // Broadcast visitor sign-out
      if (visitor.checkOutTime) {
        broadcastVisitorSignout({
          id: visitor.id,
          name: visitor.displayName ?? visitor.name,
          checkOutTime: visitor.checkOutTime.toISOString(),
        })
      }

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Visitor checked out successfully',
          visitor: toVisitorResponse(visitor),
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Visitor with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to checkout visitor',
        },
      }
    }
  },

  /**
   * Get visitor by ID
   */
  getVisitorById: async ({ params }: { params: IdParam }) => {
    try {
      const visitor = await visitorRepo.findById(params.id)

      if (!visitor) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Visitor with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: toVisitorResponse(visitor),
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch visitor',
        },
      }
    }
  },

  /**
   * Update visitor
   */
  updateVisitor: async ({ params, body }: { params: IdParam; body: UpdateVisitorInput }) => {
    try {
      const visitor = await visitorRepo.update(params.id, {
        name: body.name,
        rankPrefix: body.rankPrefix,
        firstName: body.firstName,
        lastName: body.lastName,
        organization: body.organization,
        visitType: body.visitType,
        visitTypeId: body.visitTypeId,
        visitReason: body.visitReason,
        eventId: body.eventId,
        hostMemberId: body.hostMemberId,
        checkInTime: body.checkInTime ? new Date(body.checkInTime) : undefined,
        checkOutTime: body.checkOutTime ? new Date(body.checkOutTime) : undefined,
        temporaryBadgeId: body.temporaryBadgeId,
        kioskId: body.kioskId,
        adminNotes: body.adminNotes,
        checkInMethod: body.checkInMethod,
      })

      return {
        status: 200 as const,
        body: toVisitorResponse(visitor),
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Visitor with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update visitor',
        },
      }
    }
  },
})
