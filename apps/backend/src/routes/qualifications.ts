import { initServer } from '@ts-rest/express'
import { qualificationContract } from '@sentinel/contracts'
import type {
  MemberIdParam,
  QualificationIdParam,
  QualificationTypeIdParam,
  GrantQualificationInput,
  RevokeQualificationInput,
  LockupEligibilityQuery,
  CreateQualificationType,
  UpdateQualificationType,
} from '@sentinel/contracts'
import { QualificationService } from '../services/qualification-service.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()

const qualificationService = new QualificationService(getPrismaClient())

/**
 * Convert qualification type to API response format
 */
function toQualificationTypeResponse(type: {
  id: string
  code: string
  name: string
  description: string | null
  canReceiveLockup: boolean
  displayOrder: number
  tagId: string | null
  tag: { id: string; name: string; chipVariant: string; chipColor: string } | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: type.id,
    code: type.code,
    name: type.name,
    description: type.description,
    canReceiveLockup: type.canReceiveLockup,
    displayOrder: type.displayOrder,
    tagId: type.tagId,
    tag: type.tag
      ? {
          id: type.tag.id,
          name: type.tag.name,
          chipVariant: type.tag.chipVariant,
          chipColor: type.tag.chipColor,
        }
      : null,
    createdAt: type.createdAt.toISOString(),
    updatedAt: type.updatedAt.toISOString(),
  }
}

/**
 * Convert member qualification to API response format
 */
function toMemberQualificationResponse(qual: {
  id: string
  memberId: string
  qualificationTypeId: string
  status: string
  grantedAt: Date
  grantedBy: string | null
  expiresAt: Date | null
  revokedAt: Date | null
  revokedBy: string | null
  revokeReason: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  qualificationType: {
    id: string
    code: string
    name: string
    description: string | null
    canReceiveLockup: boolean
    displayOrder: number
    tagId: string | null
    tag: { id: string; name: string; chipVariant: string; chipColor: string } | null
    createdAt: Date
    updatedAt: Date
  }
}) {
  return {
    id: qual.id,
    memberId: qual.memberId,
    qualificationTypeId: qual.qualificationTypeId,
    status: qual.status as 'active' | 'expired' | 'revoked',
    grantedAt: qual.grantedAt.toISOString(),
    grantedBy: qual.grantedBy,
    expiresAt: qual.expiresAt?.toISOString() ?? null,
    revokedAt: qual.revokedAt?.toISOString() ?? null,
    revokedBy: qual.revokedBy,
    revokeReason: qual.revokeReason,
    notes: qual.notes,
    createdAt: qual.createdAt.toISOString(),
    updatedAt: qual.updatedAt.toISOString(),
    qualificationType: toQualificationTypeResponse(qual.qualificationType),
  }
}

/**
 * Qualifications route implementation using ts-rest
 */
export const qualificationsRouter = s.router(qualificationContract, {
  /**
   * Get all qualification types
   */
  getQualificationTypes: async () => {
    try {
      const types = await qualificationService.getAllTypes()

      return {
        status: 200 as const,
        body: {
          data: types.map(toQualificationTypeResponse),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch qualification types',
        },
      }
    }
  },

  /**
   * Create a new qualification type
   */
  createQualificationType: async ({ body }: { body: CreateQualificationType }) => {
    try {
      const qualificationType = await qualificationService.createType({
        code: body.code,
        name: body.name,
        description: body.description,
        canReceiveLockup: body.canReceiveLockup,
        displayOrder: body.displayOrder,
        tagId: body.tagId,
      })

      return {
        status: 201 as const,
        body: {
          qualificationType: toQualificationTypeResponse(qualificationType),
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: error.message,
            },
          }
        }

        if (error.message.includes('Tag not found')) {
          return {
            status: 400 as const,
            body: {
              error: 'BAD_REQUEST',
              message: error.message,
            },
          }
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create qualification type',
        },
      }
    }
  },

  /**
   * Update a qualification type
   */
  updateQualificationType: async ({
    params,
    body,
  }: {
    params: QualificationTypeIdParam
    body: UpdateQualificationType
  }) => {
    try {
      const qualificationType = await qualificationService.updateType(params.id, {
        code: body.code,
        name: body.name,
        description: body.description,
        canReceiveLockup: body.canReceiveLockup,
        displayOrder: body.displayOrder,
        tagId: body.tagId,
      })

      return {
        status: 200 as const,
        body: {
          qualificationType: toQualificationTypeResponse(qualificationType),
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: error.message,
            },
          }
        }

        if (error.message.includes('already exists')) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: error.message,
            },
          }
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update qualification type',
        },
      }
    }
  },

  /**
   * Delete a qualification type
   */
  deleteQualificationType: async ({ params }: { params: QualificationTypeIdParam }) => {
    try {
      await qualificationService.deleteType(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Qualification type deleted successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: error.message,
            },
          }
        }

        if (error.message.includes('Cannot delete')) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: error.message,
            },
          }
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete qualification type',
        },
      }
    }
  },

  /**
   * Get qualifications for a specific member
   */
  getMemberQualifications: async ({ params }: { params: MemberIdParam }) => {
    try {
      const qualifications = await qualificationService.getMemberQualifications(params.memberId)

      return {
        status: 200 as const,
        body: {
          data: qualifications.map(toMemberQualificationResponse),
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

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch member qualifications',
        },
      }
    }
  },

  /**
   * Grant a qualification to a member
   */
  grantQualification: async ({
    params,
    body,
  }: {
    params: MemberIdParam
    body: GrantQualificationInput
  }) => {
    try {
      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

      const qualification = await qualificationService.grantQualification(
        params.memberId,
        body.qualificationTypeId,
        undefined, // TODO: Get from auth context
        expiresAt,
        body.notes
      )

      return {
        status: 201 as const,
        body: toMemberQualificationResponse(qualification),
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: error.message,
            },
          }
        }

        if (error.message.includes('already has')) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: error.message,
            },
          }
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to grant qualification',
        },
      }
    }
  },

  /**
   * Revoke a qualification from a member
   */
  revokeQualification: async ({
    params,
    body,
  }: {
    params: QualificationIdParam
    body: RevokeQualificationInput
  }) => {
    try {
      await qualificationService.revokeQualification(
        params.qualificationId,
        undefined, // TODO: Get from auth context
        body.revokeReason ?? undefined
      )

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Qualification revoked successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: error.message,
            },
          }
        }

        if (error.message.includes('already revoked')) {
          return {
            status: 400 as const,
            body: {
              error: 'BAD_REQUEST',
              message: error.message,
            },
          }
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to revoke qualification',
        },
      }
    }
  },

  /**
   * Get all members eligible to receive lockup responsibility
   */
  getLockupEligibleMembers: async ({ query }: { query: LockupEligibilityQuery }) => {
    try {
      const checkedInOnly = query.checkedInOnly === true

      const members = await qualificationService.getLockupEligibleMembers(checkedInOnly)

      return {
        status: 200 as const,
        body: {
          data: members.map((member) => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            rank: member.rank,
            serviceNumber: member.serviceNumber,
            isCheckedIn: member.isCheckedIn,
            qualifications: member.qualifications,
          })),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch eligible members',
        },
      }
    }
  },
})
