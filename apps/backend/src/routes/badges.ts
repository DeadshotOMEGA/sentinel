import { initServer } from '@ts-rest/express'
import { badgeContract } from '@sentinel/contracts'
import { BadgeRepository } from '../repositories/badge-repository.js'
import { MemberRepository } from '../repositories/member-repository.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()

const badgeRepo = new BadgeRepository(getPrismaClient())
const memberRepo = new MemberRepository(getPrismaClient())

/**
 * Badges route implementation using ts-rest
 */
export const badgesRouter = s.router(badgeContract, {
  /**
   * Get all badges with pagination and filtering
   */
  getBadges: async ({ query }) => {
    try {
      const page = query.page || 1
      const limit = query.limit || 50

      // Build filters
      const filters: any = {}
      if (query.status) filters.status = query.status
      if (query.assignmentType) filters.assignmentType = query.assignmentType

      // Get all badges with details
      let badges = await badgeRepo.findAllWithDetails(filters)

      // Apply additional filters
      if (query.assignedOnly) {
        badges = badges.filter((b) => b.assignmentType !== 'unassigned')
      }
      if (query.unassignedOnly) {
        badges = badges.filter((b) => b.assignmentType === 'unassigned')
      }
      if (query.search) {
        const searchLower = query.search.toLowerCase()
        badges = badges.filter((b) =>
          b.serialNumber.toLowerCase().includes(searchLower)
        )
      }

      // Paginate
      const total = badges.length
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedBadges = badges.slice(startIndex, endIndex)

      // Fetch assigned member/visitor details for each badge
      const badgesWithAssignments = await Promise.all(
        paginatedBadges.map(async (badge) => {
          let assignedTo = null

          if (badge.assignmentType === 'member' && badge.assignedToId) {
            const member = await memberRepo.findById(badge.assignedToId)
            if (member) {
              assignedTo = {
                id: member.id,
                name: `${member.rank} ${member.firstName} ${member.lastName}`,
                type: 'member',
              }
            }
          }

          return {
            id: badge.id,
            serialNumber: badge.serialNumber,
            assignmentType: badge.assignmentType,
            assignedToId: badge.assignedToId || null,
            status: badge.status,
            badgeStatusId: null,
            lastUsed: badge.lastUsed?.toISOString() || null,
            assignedTo,
            createdAt: badge.createdAt.toISOString(),
            updatedAt: badge.updatedAt.toISOString(),
          }
        })
      )

      const totalPages = Math.ceil(total / limit)

      return {
        status: 200 as const,
        body: {
          badges: badgesWithAssignments,
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
          message: error instanceof Error ? error.message : 'Failed to fetch badges',
        },
      }
    }
  },

  /**
   * Get badge statistics
   */
  getBadgeStats: async () => {
    try {
      // Get all badges
      const badges = await badgeRepo.findAll()

      // Calculate statistics
      const total = badges.length
      const assigned = badges.filter((b) => b.assignmentType !== 'unassigned').length
      const unassigned = badges.filter((b) => b.assignmentType === 'unassigned').length

      // Group by status
      const byStatus: Record<string, number> = {}
      badges.forEach((badge) => {
        byStatus[badge.status] = (byStatus[badge.status] || 0) + 1
      })

      // Group by assignment type
      const byAssignmentType: Record<string, number> = {}
      badges.forEach((badge) => {
        byAssignmentType[badge.assignmentType] = (byAssignmentType[badge.assignmentType] || 0) + 1
      })

      return {
        status: 200 as const,
        body: {
          total,
          assigned,
          unassigned,
          byStatus,
          byAssignmentType,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch badge statistics',
        },
      }
    }
  },

  /**
   * Get single badge by ID
   */
  getBadgeById: async ({ params }) => {
    try {
      const badge = await badgeRepo.findByIdWithDetails(params.id)

      if (!badge) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }

      let assignedTo = null
      if (badge.assignmentType === 'member' && badge.assignedToId) {
        const member = await memberRepo.findById(badge.assignedToId)
        if (member) {
          assignedTo = {
            id: member.id,
            name: `${member.rank} ${member.firstName} ${member.lastName}`,
            type: 'member',
          }
        }
      }

      return {
        status: 200 as const,
        body: {
          id: badge.id,
          serialNumber: badge.serialNumber,
          assignmentType: badge.assignmentType,
          assignedToId: badge.assignedToId || null,
          status: badge.status,
          badgeStatusId: null,
          lastUsed: badge.lastUsed?.toISOString() || null,
          assignedTo,
          createdAt: badge.createdAt.toISOString(),
          updatedAt: badge.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch badge',
        },
      }
    }
  },

  /**
   * Get badge by serial number
   */
  getBadgeBySerialNumber: async ({ params }) => {
    try {
      const badge = await badgeRepo.findBySerialNumber(params.serialNumber)

      if (!badge) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with serial number '${params.serialNumber}' not found`,
          },
        }
      }

      let assignedTo = null
      if (badge.assignmentType === 'member' && badge.assignedToId) {
        const member = await memberRepo.findById(badge.assignedToId)
        if (member) {
          assignedTo = {
            id: member.id,
            name: `${member.rank} ${member.firstName} ${member.lastName}`,
            type: 'member',
          }
        }
      }

      return {
        status: 200 as const,
        body: {
          id: badge.id,
          serialNumber: badge.serialNumber,
          assignmentType: badge.assignmentType,
          assignedToId: badge.assignedToId || null,
          status: badge.status,
          badgeStatusId: null,
          lastUsed: badge.lastUsed?.toISOString() || null,
          assignedTo,
          createdAt: badge.createdAt.toISOString(),
          updatedAt: badge.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch badge',
        },
      }
    }
  },

  /**
   * Create new badge
   */
  createBadge: async ({ body }) => {
    try {
      const badge = await badgeRepo.create({
        serialNumber: body.serialNumber,
        assignmentType: body.assignmentType || 'unassigned',
        assignedToId: body.assignedToId,
        status: body.status || 'active',
      })

      let assignedTo = null
      if (badge.assignmentType === 'member' && badge.assignedToId) {
        const member = await memberRepo.findById(badge.assignedToId)
        if (member) {
          assignedTo = {
            id: member.id,
            name: `${member.rank} ${member.firstName} ${member.lastName}`,
            type: 'member',
          }
        }
      }

      return {
        status: 201 as const,
        body: {
          id: badge.id,
          serialNumber: badge.serialNumber,
          assignmentType: badge.assignmentType,
          assignedToId: badge.assignedToId || null,
          status: badge.status,
          badgeStatusId: null,
          lastUsed: badge.lastUsed?.toISOString() || null,
          assignedTo,
          createdAt: badge.createdAt.toISOString(),
          updatedAt: badge.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Badge with serial number '${body.serialNumber}' already exists`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create badge',
        },
      }
    }
  },

  /**
   * Update existing badge
   */
  updateBadge: async ({ params, body }) => {
    try {
      // Update badge status if provided
      let badge = await badgeRepo.findById(params.id)
      if (!badge) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }

      if (body.status) {
        badge = await badgeRepo.updateStatus(params.id, body.status)
      }

      // Handle assignment changes
      if (body.assignmentType && body.assignedToId) {
        badge = await badgeRepo.assign(params.id, body.assignedToId, body.assignmentType)
      } else if (body.assignmentType === 'unassigned') {
        badge = await badgeRepo.unassign(params.id)
      }

      let assignedTo = null
      if (badge.assignmentType === 'member' && badge.assignedToId) {
        const member = await memberRepo.findById(badge.assignedToId)
        if (member) {
          assignedTo = {
            id: member.id,
            name: `${member.rank} ${member.firstName} ${member.lastName}`,
            type: 'member',
          }
        }
      }

      return {
        status: 200 as const,
        body: {
          id: badge.id,
          serialNumber: badge.serialNumber,
          assignmentType: badge.assignmentType,
          assignedToId: badge.assignedToId || null,
          status: badge.status,
          badgeStatusId: null,
          lastUsed: badge.lastUsed?.toISOString() || null,
          assignedTo,
          createdAt: badge.createdAt.toISOString(),
          updatedAt: badge.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update badge',
        },
      }
    }
  },

  /**
   * Assign badge to member or visitor
   */
  assignBadge: async ({ params, body }) => {
    try {
      // Validate that the assigned entity exists
      if (body.assignmentType === 'member') {
        const member = await memberRepo.findById(body.assignedToId)
        if (!member) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: `Member with ID '${body.assignedToId}' not found`,
            },
          }
        }
      }

      const badge = await badgeRepo.assign(
        params.id,
        body.assignedToId,
        body.assignmentType
      )

      let assignedTo = null
      if (badge.assignmentType === 'member' && badge.assignedToId) {
        const member = await memberRepo.findById(badge.assignedToId)
        if (member) {
          assignedTo = {
            id: member.id,
            name: `${member.rank} ${member.firstName} ${member.lastName}`,
            type: 'member',
          }
        }
      }

      return {
        status: 200 as const,
        body: {
          id: badge.id,
          serialNumber: badge.serialNumber,
          assignmentType: badge.assignmentType,
          assignedToId: badge.assignedToId || null,
          status: badge.status,
          badgeStatusId: null,
          lastUsed: badge.lastUsed?.toISOString() || null,
          assignedTo,
          createdAt: badge.createdAt.toISOString(),
          updatedAt: badge.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }

      if (error instanceof Error && error.message.includes('Cannot assign')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: error.message,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to assign badge',
        },
      }
    }
  },

  /**
   * Unassign badge
   */
  unassignBadge: async ({ params }) => {
    try {
      const badge = await badgeRepo.unassign(params.id)

      return {
        status: 200 as const,
        body: {
          id: badge.id,
          serialNumber: badge.serialNumber,
          assignmentType: badge.assignmentType,
          assignedToId: null,
          status: badge.status,
          badgeStatusId: null,
          lastUsed: badge.lastUsed?.toISOString() || null,
          assignedTo: null,
          createdAt: badge.createdAt.toISOString(),
          updatedAt: badge.updatedAt.toISOString(),
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to unassign badge',
        },
      }
    }
  },

  /**
   * Delete badge
   */
  deleteBadge: async ({ params }) => {
    try {
      await badgeRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Badge deleted successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete badge',
        },
      }
    }
  },
})
