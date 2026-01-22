import { initServer } from '@ts-rest/express'
import {
  visitTypesContract,
  memberStatusesContract,
  memberTypesContract,
  badgeStatusesContract,
} from '@sentinel/contracts'
import { VisitTypeRepository } from '../repositories/visit-type-repository.js'
import { MemberStatusRepository } from '../repositories/member-status-repository.js'
import { MemberTypeRepository } from '../repositories/member-type-repository.js'
import { BadgeStatusRepository } from '../repositories/badge-status-repository.js'
import { getPrismaClient } from '../lib/database.js'
import type {
  VisitTypeEnum,
  MemberStatusEnum,
  MemberTypeEnum,
  BadgeStatusEnum,
} from '@sentinel/types'
import type { EnumResponse } from '@sentinel/contracts'

const s = initServer()

// Initialize repositories
const visitTypeRepo = new VisitTypeRepository(getPrismaClient())
const memberStatusRepo = new MemberStatusRepository(getPrismaClient())
const memberTypeRepo = new MemberTypeRepository(getPrismaClient())
const badgeStatusRepo = new BadgeStatusRepository(getPrismaClient())

/**
 * Convert repository enum type to API format
 */
function toEnumResponse(
  item: VisitTypeEnum | MemberStatusEnum | MemberTypeEnum | BadgeStatusEnum,
  usageCount?: number
): EnumResponse {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? null,
    color: 'color' in item ? (item.color ?? null) : null,
    usageCount,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

// ==================== Visit Types ====================

export const visitTypesRouter = s.router(visitTypesContract, {
  /**
   * Get all visit types with usage counts
   */
  getVisitTypes: async () => {
    try {
      const items = await visitTypeRepo.findAll()
      const visitTypes = await Promise.all(
        items.map(async (item) => {
          const usageCount = await visitTypeRepo.getUsageCount(item.id)
          return toEnumResponse(item, usageCount)
        })
      )

      return {
        status: 200 as const,
        body: { visitTypes },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch visit types',
        },
      }
    }
  },

  /**
   * Create new visit type
   */
  createVisitType: async ({ body }) => {
    try {
      // Check if code already exists
      const existing = await visitTypeRepo.findByCode(body.code)
      if (existing) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Visit type code "${body.code}" already exists`,
          },
        }
      }

      const visitType = await visitTypeRepo.create({
        code: body.code,
        name: body.name,
        description: body.description,
        color: body.color,
      })

      return {
        status: 201 as const,
        body: {
          visitType: toEnumResponse(visitType),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create visit type',
        },
      }
    }
  },

  /**
   * Update visit type
   */
  updateVisitType: async ({ params, body }) => {
    try {
      // Check if visit type exists
      const existing = await visitTypeRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Visit type with ID '${params.id}' not found`,
          },
        }
      }

      // If updating code, check for conflicts
      if (body.code && body.code !== existing.code) {
        const conflict = await visitTypeRepo.findByCode(body.code)
        if (conflict) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: `Visit type code "${body.code}" already exists`,
            },
          }
        }
      }

      const visitType = await visitTypeRepo.update(params.id, {
        code: body.code,
        name: body.name,
        description: body.description,
        color: body.color,
      })

      return {
        status: 200 as const,
        body: {
          visitType: toEnumResponse(visitType),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update visit type',
        },
      }
    }
  },

  /**
   * Delete visit type
   */
  deleteVisitType: async ({ params }) => {
    try {
      // Check if visit type exists
      const existing = await visitTypeRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Visit type with ID '${params.id}' not found`,
          },
        }
      }

      // Check usage count
      const usageCount = await visitTypeRepo.getUsageCount(params.id)
      if (usageCount > 0) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Cannot delete this visit type. It is currently in use by ${usageCount} records.`,
          },
        }
      }

      await visitTypeRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Visit type deleted successfully',
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete visit type',
        },
      }
    }
  },
})

// ==================== Member Statuses ====================

export const memberStatusesRouter = s.router(memberStatusesContract, {
  /**
   * Get all member statuses with usage counts
   */
  getMemberStatuses: async () => {
    try {
      const items = await memberStatusRepo.findAll()
      const memberStatuses = await Promise.all(
        items.map(async (item) => {
          const usageCount = await memberStatusRepo.getUsageCount(item.id)
          return toEnumResponse(item, usageCount)
        })
      )

      return {
        status: 200 as const,
        body: { memberStatuses },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch member statuses',
        },
      }
    }
  },

  /**
   * Create new member status
   */
  createMemberStatus: async ({ body }) => {
    try {
      // Check if code already exists
      const existing = await memberStatusRepo.findByCode(body.code)
      if (existing) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Member status code "${body.code}" already exists`,
          },
        }
      }

      const memberStatus = await memberStatusRepo.create({
        code: body.code,
        name: body.name,
        description: body.description,
        color: body.color,
      })

      return {
        status: 201 as const,
        body: {
          memberStatus: toEnumResponse(memberStatus),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create member status',
        },
      }
    }
  },

  /**
   * Update member status
   */
  updateMemberStatus: async ({ params, body }) => {
    try {
      // Check if member status exists
      const existing = await memberStatusRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member status with ID '${params.id}' not found`,
          },
        }
      }

      // If updating code, check for conflicts
      if (body.code && body.code !== existing.code) {
        const conflict = await memberStatusRepo.findByCode(body.code)
        if (conflict) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: `Member status code "${body.code}" already exists`,
            },
          }
        }
      }

      const memberStatus = await memberStatusRepo.update(params.id, {
        code: body.code,
        name: body.name,
        description: body.description,
        color: body.color,
      })

      return {
        status: 200 as const,
        body: {
          memberStatus: toEnumResponse(memberStatus),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update member status',
        },
      }
    }
  },

  /**
   * Delete member status
   */
  deleteMemberStatus: async ({ params }) => {
    try {
      // Check if member status exists
      const existing = await memberStatusRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member status with ID '${params.id}' not found`,
          },
        }
      }

      // Check usage count
      const usageCount = await memberStatusRepo.getUsageCount(params.id)
      if (usageCount > 0) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Cannot delete this member status. It is currently in use by ${usageCount} records.`,
          },
        }
      }

      await memberStatusRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Member status deleted successfully',
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete member status',
        },
      }
    }
  },
})

// ==================== Member Types ====================

export const memberTypesRouter = s.router(memberTypesContract, {
  /**
   * Get all member types with usage counts
   */
  getMemberTypes: async () => {
    try {
      const items = await memberTypeRepo.findAll()
      const memberTypes = await Promise.all(
        items.map(async (item) => {
          const usageCount = await memberTypeRepo.getUsageCount(item.id)
          return toEnumResponse(item, usageCount)
        })
      )

      return {
        status: 200 as const,
        body: { memberTypes },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch member types',
        },
      }
    }
  },

  /**
   * Create new member type
   */
  createMemberType: async ({ body }) => {
    try {
      // Check if code already exists
      const existing = await memberTypeRepo.findByCode(body.code)
      if (existing) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Member type code "${body.code}" already exists`,
          },
        }
      }

      const memberType = await memberTypeRepo.create({
        code: body.code,
        name: body.name,
        description: body.description,
      })

      return {
        status: 201 as const,
        body: {
          memberType: toEnumResponse(memberType),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create member type',
        },
      }
    }
  },

  /**
   * Update member type
   */
  updateMemberType: async ({ params, body }) => {
    try {
      // Check if member type exists
      const existing = await memberTypeRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member type with ID '${params.id}' not found`,
          },
        }
      }

      // If updating code, check for conflicts
      if (body.code && body.code !== existing.code) {
        const conflict = await memberTypeRepo.findByCode(body.code)
        if (conflict) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: `Member type code "${body.code}" already exists`,
            },
          }
        }
      }

      const memberType = await memberTypeRepo.update(params.id, {
        code: body.code,
        name: body.name,
        description: body.description,
      })

      return {
        status: 200 as const,
        body: {
          memberType: toEnumResponse(memberType),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update member type',
        },
      }
    }
  },

  /**
   * Delete member type
   */
  deleteMemberType: async ({ params }) => {
    try {
      // Check if member type exists
      const existing = await memberTypeRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member type with ID '${params.id}' not found`,
          },
        }
      }

      // Check usage count
      const usageCount = await memberTypeRepo.getUsageCount(params.id)
      if (usageCount > 0) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Cannot delete this member type. It is currently in use by ${usageCount} records.`,
          },
        }
      }

      await memberTypeRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Member type deleted successfully',
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete member type',
        },
      }
    }
  },
})

// ==================== Badge Statuses ====================

export const badgeStatusesRouter = s.router(badgeStatusesContract, {
  /**
   * Get all badge statuses with usage counts
   */
  getBadgeStatuses: async () => {
    try {
      const items = await badgeStatusRepo.findAll()
      const badgeStatuses = await Promise.all(
        items.map(async (item) => {
          const usageCount = await badgeStatusRepo.getUsageCount(item.id)
          return toEnumResponse(item, usageCount)
        })
      )

      return {
        status: 200 as const,
        body: { badgeStatuses },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch badge statuses',
        },
      }
    }
  },

  /**
   * Create new badge status
   */
  createBadgeStatus: async ({ body }) => {
    try {
      // Check if code already exists
      const existing = await badgeStatusRepo.findByCode(body.code)
      if (existing) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Badge status code "${body.code}" already exists`,
          },
        }
      }

      const badgeStatus = await badgeStatusRepo.create({
        code: body.code,
        name: body.name,
        description: body.description,
        color: body.color,
      })

      return {
        status: 201 as const,
        body: {
          badgeStatus: toEnumResponse(badgeStatus),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create badge status',
        },
      }
    }
  },

  /**
   * Update badge status
   */
  updateBadgeStatus: async ({ params, body }) => {
    try {
      // Check if badge status exists
      const existing = await badgeStatusRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge status with ID '${params.id}' not found`,
          },
        }
      }

      // If updating code, check for conflicts
      if (body.code && body.code !== existing.code) {
        const conflict = await badgeStatusRepo.findByCode(body.code)
        if (conflict) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: `Badge status code "${body.code}" already exists`,
            },
          }
        }
      }

      const badgeStatus = await badgeStatusRepo.update(params.id, {
        code: body.code,
        name: body.name,
        description: body.description,
        color: body.color,
      })

      return {
        status: 200 as const,
        body: {
          badgeStatus: toEnumResponse(badgeStatus),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update badge status',
        },
      }
    }
  },

  /**
   * Delete badge status
   */
  deleteBadgeStatus: async ({ params }) => {
    try {
      // Check if badge status exists
      const existing = await badgeStatusRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Badge status with ID '${params.id}' not found`,
          },
        }
      }

      // Check usage count
      const usageCount = await badgeStatusRepo.getUsageCount(params.id)
      if (usageCount > 0) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Cannot delete this badge status. It is currently in use by ${usageCount} records.`,
          },
        }
      }

      await badgeStatusRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Badge status deleted successfully',
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete badge status',
        },
      }
    }
  },
})
