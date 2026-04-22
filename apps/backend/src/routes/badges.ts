import { initServer } from '@ts-rest/express'
import { badgeContract } from '@sentinel/contracts'
import type {
  BadgeListQuery,
  CreateBadgeInput,
  UpdateBadgeInput,
  AssignBadgeInput,
  DeleteBadgeInput,
  IdParam,
} from '@sentinel/contracts'
import type { Request } from 'express'
import { formatAuditMemberName, logRequestAudit } from '../lib/audit-log.js'
import { AuditRepository } from '../repositories/audit-repository.js'
import { BadgeRepository } from '../repositories/badge-repository.js'
import { MemberRepository } from '../repositories/member-repository.js'
import { getPrismaClient } from '../lib/database.js'
import { badgeService } from '../services/badge-service.js'
import { formatAssignedMemberName, matchesBadgeSearch } from '../lib/badge-search.js'

const s = initServer()

const badgeRepo = new BadgeRepository(getPrismaClient())
const memberRepo = new MemberRepository(getPrismaClient())
const auditRepo = new AuditRepository(getPrismaClient())

async function getAssignedMemberAuditDetails(memberId?: string | null) {
  if (!memberId) {
    return {
      assignedMemberId: null,
      assignedMemberName: null,
      assignedMemberServiceNumber: null,
    }
  }

  const member = await memberRepo.findById(memberId)

  return {
    assignedMemberId: member?.id ?? memberId,
    assignedMemberName: formatAuditMemberName(member),
    assignedMemberServiceNumber: member?.serviceNumber ?? null,
  }
}

/**
 * Badges route implementation using ts-rest
 */
export const badgesRouter = s.router(badgeContract, {
  /**
   * Get all badges with pagination and filtering
   */
  getBadges: async ({ query }: { query: BadgeListQuery }) => {
    try {
      const page = query.page || 1
      const limit = query.limit || 50

      // Build filters
      const filters: Record<string, unknown> = {}
      if (query.status) filters.status = query.status
      if (query.assignmentType) filters.assignmentType = query.assignmentType

      // Get all badges with details
      let badges = await badgeRepo.findAllWithDetails(filters)

      if (!query.includeDecommissioned && query.status !== 'decommissioned') {
        badges = badges.filter((badge) => badge.status !== 'decommissioned')
      }

      // Apply additional filters
      if (query.assignedOnly) {
        badges = badges.filter((b) => b.assignmentType !== 'unassigned')
      }
      if (query.unassignedOnly) {
        badges = badges.filter((b) => b.assignmentType === 'unassigned')
      }
      const searchQuery = query.search?.trim()
      if (searchQuery) {
        badges = badges.filter((badge) => matchesBadgeSearch(badge, searchQuery))
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

          if (badge.assignmentType === 'member' && badge.assignedMember) {
            assignedTo = {
              id: badge.assignedMember.id,
              name: formatAssignedMemberName(badge.assignedMember),
              type: 'member',
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
  getBadgeById: async ({ params }: { params: IdParam }) => {
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
  getBadgeBySerialNumber: async ({ params }: { params: { serialNumber: string } }) => {
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
  createBadge: async ({ body, req }: { body: CreateBadgeInput; req: Request }) => {
    try {
      const initialAssignmentType =
        body.assignmentType === 'member' ? 'unassigned' : (body.assignmentType ?? 'unassigned')

      let badge = await badgeRepo.create({
        serialNumber: body.serialNumber,
        assignmentType: initialAssignmentType,
        assignedToId: initialAssignmentType !== 'unassigned' ? body.assignedToId : undefined,
        status: body.status || 'active',
      })

      if (body.assignmentType === 'member' && body.assignedToId) {
        badge = await badgeService.assign(badge.id, body.assignedToId)
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

      await logRequestAudit(auditRepo, req, {
        action: 'badge_create',
        entityType: 'badge',
        entityId: badge.id,
        details: {
          badgeSerialNumber: badge.serialNumber,
          status: badge.status,
          assignmentType: badge.assignmentType,
          ...(await getAssignedMemberAuditDetails(badge.assignedToId)),
        },
      })

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
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      if (
        error instanceof Error &&
        (error.message.includes('already assigned') ||
          error.message.includes('already has badge') ||
          error.message.includes('cannot be assigned'))
      ) {
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
          message: error instanceof Error ? error.message : 'Failed to create badge',
        },
      }
    }
  },

  /**
   * Update existing badge
   */
  updateBadge: async ({
    params,
    body,
    req,
  }: {
    params: IdParam
    body: UpdateBadgeInput
    req: Request
  }) => {
    try {
      // Update badge status if provided
      const existingBadge = await badgeRepo.findById(params.id)
      if (!existingBadge) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }
      let badge = existingBadge

      if (body.status) {
        badge = await badgeService.updateStatus(params.id, body.status)
      }

      // Handle assignment changes
      if (body.assignmentType && body.assignedToId) {
        if (body.assignmentType === 'member') {
          if (badge.assignmentType !== 'unassigned' || badge.assignedToId) {
            await badgeService.unassign(params.id)
          }
          badge = await badgeService.assign(params.id, body.assignedToId)
        } else {
          if (badge.assignmentType === 'member' && badge.assignedToId) {
            await badgeService.unassign(params.id)
          }
          badge = await badgeRepo.assign(params.id, body.assignedToId, body.assignmentType)
        }
      } else if (body.assignmentType === 'unassigned') {
        badge = await badgeService.unassign(params.id)
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

      if (existingBadge.status !== badge.status) {
        await logRequestAudit(auditRepo, req, {
          action: 'badge_status_change',
          entityType: 'badge',
          entityId: badge.id,
          details: {
            badgeSerialNumber: badge.serialNumber,
            previousStatus: existingBadge.status,
            currentStatus: badge.status,
          },
        })
      }

      if (
        existingBadge.assignmentType !== badge.assignmentType ||
        existingBadge.assignedToId !== badge.assignedToId
      ) {
        await logRequestAudit(auditRepo, req, {
          action: badge.assignmentType === 'unassigned' ? 'badge_unassign' : 'badge_assign',
          entityType: 'badge',
          entityId: badge.id,
          details: {
            badgeSerialNumber: badge.serialNumber,
            previousAssignmentType: existingBadge.assignmentType,
            currentAssignmentType: badge.assignmentType,
            previousAssignedMember: await getAssignedMemberAuditDetails(existingBadge.assignedToId),
            currentAssignedMember: await getAssignedMemberAuditDetails(badge.assignedToId),
          },
        })
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
      if (error instanceof Error && error.message.includes('protected Sentinel bootstrap badge')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: error.message,
          },
        }
      }
      if (
        error instanceof Error &&
        (error.message.includes('already assigned') ||
          error.message.includes('already has badge') ||
          error.message.includes('cannot be assigned'))
      ) {
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
          message: error instanceof Error ? error.message : 'Failed to update badge',
        },
      }
    }
  },

  /**
   * Assign badge to member or visitor
   */
  assignBadge: async ({
    params,
    body,
    req,
  }: {
    params: IdParam
    body: AssignBadgeInput
    req: Request
  }) => {
    try {
      const existingBadge = await badgeRepo.findById(params.id)
      if (!existingBadge) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }

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

      const badge =
        body.assignmentType === 'member'
          ? await badgeService.assign(params.id, body.assignedToId)
          : await badgeRepo.assign(params.id, body.assignedToId, body.assignmentType)

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

      await logRequestAudit(auditRepo, req, {
        action: 'badge_assign',
        entityType: 'badge',
        entityId: badge.id,
        details: {
          badgeSerialNumber: badge.serialNumber,
          previousAssignmentType: existingBadge.assignmentType,
          currentAssignmentType: badge.assignmentType,
          previousAssignedMember: await getAssignedMemberAuditDetails(existingBadge.assignedToId),
          currentAssignedMember: await getAssignedMemberAuditDetails(badge.assignedToId),
        },
      })

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

      if (
        error instanceof Error &&
        (error.message.includes('Cannot assign') ||
          error.message.includes('cannot be assigned') ||
          error.message.includes('already assigned') ||
          error.message.includes('already has badge'))
      ) {
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
  unassignBadge: async ({ params, req }: { params: IdParam; req: Request }) => {
    try {
      const existingBadge = await badgeRepo.findById(params.id)
      if (!existingBadge) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }

      const badge = await badgeService.unassign(params.id)

      await logRequestAudit(auditRepo, req, {
        action: 'badge_unassign',
        entityType: 'badge',
        entityId: badge.id,
        details: {
          badgeSerialNumber: badge.serialNumber,
          previousAssignmentType: existingBadge.assignmentType,
          currentAssignmentType: badge.assignmentType,
          previousAssignedMember: await getAssignedMemberAuditDetails(existingBadge.assignedToId),
          currentAssignedMember: await getAssignedMemberAuditDetails(badge.assignedToId),
        },
      })

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
  deleteBadge: async ({
    params,
    body,
    req,
  }: {
    params: IdParam
    body: DeleteBadgeInput
    req: Request
  }) => {
    try {
      const existingBadge = await badgeRepo.findById(params.id)
      if (!existingBadge) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge with ID '${params.id}' not found`,
          },
        }
      }

      await badgeService.delete(params.id, body)

      await logRequestAudit(auditRepo, req, {
        action: 'badge_delete',
        entityType: 'badge',
        entityId: params.id,
        details: {
          badgeSerialNumber: existingBadge.serialNumber,
          status: existingBadge.status,
          assignmentType: existingBadge.assignmentType,
          assignedMember: await getAssignedMemberAuditDetails(existingBadge.assignedToId),
          unassignFirst: body.unassignFirst ?? false,
        },
      })

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
      if (
        error instanceof Error &&
        (error.message.includes('historical activity') ||
          error.message.includes('currently assigned') ||
          error.message.includes('protected Sentinel bootstrap badge'))
      ) {
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
          message: error instanceof Error ? error.message : 'Failed to delete badge',
        },
      }
    }
  },
})
