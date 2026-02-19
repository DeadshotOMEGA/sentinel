import { initServer } from '@ts-rest/express'
import { memberContract } from '@sentinel/contracts'
import type {
  MemberListQuery,
  CreateMemberInput,
  UpdateMemberInput,
  IdParam,
  PreviewImportRequest,
  ExecuteImportRequest,
} from '@sentinel/contracts'
import type { MemberStatus } from '@sentinel/types'
import { MemberRepository } from '../repositories/member-repository.js'
import { AutoQualificationService } from '../services/auto-qualification-service.js'
import { importService } from '../services/import-service.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()

const memberRepo = new MemberRepository(getPrismaClient())
const autoQualService = new AutoQualificationService(getPrismaClient())

/**
 * Members route implementation using ts-rest
 */
export const membersRouter = s.router(memberContract, {
  /**
   * Get all members with pagination
   */
  getMembers: async ({
    query,
    req,
  }: {
    query: MemberListQuery
    req: { member?: { accountLevel?: number } }
  }) => {
    try {
      const page = query.page ? Number(query.page) : 1
      const limit = query.limit ? Number(query.limit) : 50

      // Only admin+ users can see hidden members
      const isAdmin = (req.member?.accountLevel ?? 0) >= 5
      const includeHidden = query.includeHidden === true && isAdmin

      const filters: {
        divisionId?: string
        search?: string
        status?: MemberStatus
        qualificationCode?: string
        includeHidden?: boolean
      } = {
        divisionId: query.divisionId,
        search: query.search,
        qualificationCode: query.qualificationCode,
        includeHidden,
      }
      if (query.status) {
        filters.status = query.status as MemberStatus
      }

      const result = await memberRepo.findPaginated({ page, limit }, filters)

      const totalPages = Math.ceil(result.total / limit)

      return {
        status: 200 as const,
        body: {
          members: result.members.map((member) => ({
            id: member.id,
            serviceNumber: member.serviceNumber,
            rank: member.rank,
            displayName:
              member.displayName ?? `${member.rank} ${member.lastName}, ${member.firstName}`,
            firstName: member.firstName,
            lastName: member.lastName,
            middleInitial: member.initials || null,
            email: member.email || null,
            phoneNumber: member.mobilePhone || member.homePhone || null,
            divisionId: member.divisionId ?? null,
            badgeId: member.badgeId || null,
            badgeStatus: member.badge?.badgeStatusSummary
              ? {
                  name: member.badge.badgeStatusSummary.name,
                  chipVariant: member.badge.badgeStatusSummary.chipVariant,
                  chipColor: member.badge.badgeStatusSummary.chipColor,
                }
              : undefined,
            memberTypeId: member.memberTypeId || null,
            memberStatusId: member.memberStatusId || null,
            qualifications: member.qualifications?.map((q) => ({
              code: q.code,
              name: q.name,
              chipVariant: q.chipVariant ?? undefined,
              chipColor: q.chipColor ?? undefined,
              tagId: q.tagId ?? undefined,
            })),
            tags: member.tags?.map((t) => ({
              id: t.id,
              name: t.name,
              chipVariant: t.chipVariant ?? 'solid',
              chipColor: t.chipColor ?? 'default',
            })),
            missedCheckoutCount: member.missedCheckoutCount ?? 0,
            lastMissedCheckout: member.lastMissedCheckout?.toISOString() ?? null,
            createdAt: member.createdAt.toISOString(),
            updatedAt: member.updatedAt?.toISOString() || null,
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
          message: error instanceof Error ? error.message : 'Failed to fetch members',
        },
      }
    }
  },

  /**
   * Get single member by ID
   */
  getMemberById: async ({ params }: { params: IdParam }) => {
    try {
      const member = await memberRepo.findById(params.id)

      if (!member) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          id: member.id,
          serviceNumber: member.serviceNumber,
          rank: member.rank,
          displayName:
            member.displayName ?? `${member.rank} ${member.lastName}, ${member.firstName}`,
          firstName: member.firstName,
          lastName: member.lastName,
          middleInitial: member.initials || null,
          email: member.email || null,
          phoneNumber: member.mobilePhone || member.homePhone || null,
          divisionId: member.divisionId ?? null,
          badgeId: member.badgeId || null,
          memberTypeId: null,
          memberStatusId: null,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt?.toISOString() || null,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch member',
        },
      }
    }
  },

  /**
   * Create new member
   */
  createMember: async ({ body }: { body: CreateMemberInput }) => {
    try {
      const member = await memberRepo.create({
        serviceNumber: body.serviceNumber,
        rank: body.rank,
        firstName: body.firstName,
        lastName: body.lastName,
        initials: body.middleInitial,
        divisionId: body.divisionId,
        email: body.email,
        mobilePhone: body.phoneNumber,
        memberType: 'class_a', // TODO: Map from memberTypeId when FK migration complete
        // memberTypeId and memberStatusId not yet supported by repository
        badgeId: body.badgeId,
      })

      // Auto-sync qualifications for new member (non-blocking)
      try {
        await autoQualService.syncMember(member.id)
      } catch {
        // Non-blocking: don't fail create if sync errors
      }

      return {
        status: 201 as const,
        body: {
          id: member.id,
          serviceNumber: member.serviceNumber,
          rank: member.rank,
          displayName:
            member.displayName ?? `${member.rank} ${member.lastName}, ${member.firstName}`,
          firstName: member.firstName,
          lastName: member.lastName,
          middleInitial: member.initials || null,
          email: member.email || null,
          phoneNumber: member.mobilePhone || null,
          divisionId: member.divisionId ?? null,
          badgeId: member.badgeId || null,
          memberTypeId: null,
          memberStatusId: null,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt?.toISOString() || null,
        },
      }
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: `Member with service number '${body.serviceNumber}' already exists`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create member',
        },
      }
    }
  },

  /**
   * Update existing member
   */
  updateMember: async ({ params, body }: { params: IdParam; body: UpdateMemberInput }) => {
    try {
      const member = await memberRepo.update(params.id, {
        serviceNumber: body.serviceNumber,
        rank: body.rank,
        firstName: body.firstName,
        lastName: body.lastName,
        initials: body.middleInitial,
        divisionId: body.divisionId,
        email: body.email,
        mobilePhone: body.phoneNumber,
        badgeId: body.badgeId,
        memberTypeId: body.memberTypeId,
        memberStatusId: body.memberStatusId,
      })

      // Auto-sync qualifications if rank or division changed (non-blocking)
      if (body.rank !== undefined || body.divisionId !== undefined) {
        try {
          await autoQualService.syncMember(params.id)
        } catch {
          // Non-blocking: don't fail update if sync errors
        }
      }

      return {
        status: 200 as const,
        body: {
          id: member.id,
          serviceNumber: member.serviceNumber,
          rank: member.rank,
          displayName:
            member.displayName ?? `${member.rank} ${member.lastName}, ${member.firstName}`,
          firstName: member.firstName,
          lastName: member.lastName,
          middleInitial: member.initials || null,
          email: member.email || null,
          phoneNumber: member.mobilePhone || null,
          divisionId: member.divisionId ?? null,
          badgeId: member.badgeId || null,
          memberTypeId: member.memberTypeId || null,
          memberStatusId: member.memberStatusId || null,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt?.toISOString() || null,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update member',
        },
      }
    }
  },

  /**
   * Delete member
   */
  deleteMember: async ({ params }: { params: IdParam }) => {
    try {
      await memberRepo.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Member deleted successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete member',
        },
      }
    }
  },

  /**
   * Search member by service number
   */
  searchByServiceNumber: async ({ params }: { params: { serviceNumber: string } }) => {
    try {
      const member = await memberRepo.findByServiceNumber(params.serviceNumber)

      if (!member) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with service number '${params.serviceNumber}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          id: member.id,
          serviceNumber: member.serviceNumber,
          rank: member.rank,
          displayName:
            member.displayName ?? `${member.rank} ${member.lastName}, ${member.firstName}`,
          firstName: member.firstName,
          lastName: member.lastName,
          middleInitial: member.initials || null,
          email: member.email || null,
          phoneNumber: member.mobilePhone || null,
          divisionId: member.divisionId ?? null,
          badgeId: member.badgeId || null,
          memberTypeId: null,
          memberStatusId: null,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt?.toISOString() || null,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to search member',
        },
      }
    }
  },

  /**
   * Preview Nominal Roll import
   */
  previewImport: async ({ body }: { body: PreviewImportRequest }) => {
    try {
      const preview = await importService.generatePreview(body.csvText)

      return {
        status: 200 as const,
        body: preview,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to preview import',
        },
      }
    }
  },

  /**
   * Execute Nominal Roll import
   */
  executeImport: async ({ body }: { body: ExecuteImportRequest }) => {
    try {
      const result = await importService.executeImport(
        body.csvText,
        body.deactivateIds,
        body.excludeRows,
        body.createDivisions
      )

      return {
        status: 200 as const,
        body: result,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute import',
        },
      }
    }
  },
})
