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
import type { Request } from 'express'
import type { Member, MemberStatus, MemberWithDivision } from '@sentinel/types'
import { MemberRepository } from '../repositories/member-repository.js'
import { AuditRepository } from '../repositories/audit-repository.js'
import { AutoQualificationService } from '../services/auto-qualification-service.js'
import { badgeService } from '../services/badge-service.js'
import { importService } from '../services/import-service.js'
import { memberService } from '../services/member-service.js'
import { getPrismaClient } from '../lib/database.js'
import { formatAuditMemberName, logRequestAudit } from '../lib/audit-log.js'
import { resolveMemberScope } from '../lib/member-records.js'
import { AccountLevel } from '../middleware/roles.js'
import { ConflictError, NotFoundError } from '../middleware/error-handler.js'

const s = initServer()

const memberRepo = new MemberRepository(getPrismaClient())
const auditRepo = new AuditRepository(getPrismaClient())
const autoQualService = new AutoQualificationService(getPrismaClient())

function toMemberResponse(member: Member | MemberWithDivision) {
  const memberWithDetails = member as MemberWithDivision

  return {
    id: member.id,
    serviceNumber: member.serviceNumber,
    rank: member.rank,
    displayName: member.displayName ?? `${member.rank} ${member.lastName}, ${member.firstName}`,
    firstName: member.firstName,
    lastName: member.lastName,
    middleInitial: member.initials || null,
    moc: member.moc || null,
    classDetails: member.classDetails || null,
    memberType: member.memberType,
    memberSource: member.memberSource,
    email: member.email || null,
    phoneNumber: member.mobilePhone || member.homePhone || null,
    divisionId: member.divisionId ?? null,
    badgeId: member.badgeId || null,
    accountLevel: member.accountLevel,
    mustChangePin: member.mustChangePin,
    badgeStatus: memberWithDetails.badge?.badgeStatusSummary
      ? {
          name: memberWithDetails.badge.badgeStatusSummary.name,
          chipVariant: memberWithDetails.badge.badgeStatusSummary.chipVariant,
          chipColor: memberWithDetails.badge.badgeStatusSummary.chipColor,
        }
      : undefined,
    memberTypeId: member.memberTypeId || null,
    memberStatusId: member.memberStatusId || null,
    qualifications: memberWithDetails.qualifications?.map((qualification) => ({
      code: qualification.code,
      name: qualification.name,
      chipVariant: qualification.chipVariant ?? undefined,
      chipColor: qualification.chipColor ?? undefined,
      tagId: qualification.tagId ?? undefined,
    })),
    tags: memberWithDetails.tags?.map((tag) => ({
      id: tag.id,
      name: tag.name,
      chipVariant: tag.chipVariant ?? 'solid',
      chipColor: tag.chipColor ?? 'default',
    })),
    missedCheckoutCount: member.missedCheckoutCount ?? 0,
    lastMissedCheckout: member.lastMissedCheckout?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt?.toISOString() || null,
  }
}

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
      const scope = resolveMemberScope(query.scope, isAdmin)

      const filters: {
        divisionId?: string
        search?: string
        status?: MemberStatus
        ranks?: string[]
        tags?: string[]
        qualificationCode?: string
        includeHidden?: boolean
        memberSource?: 'nominal_roll' | 'civilian_manual'
      } = {
        divisionId: query.divisionId,
        search: query.search,
        ranks:
          query.ranks && query.ranks.length > 0
            ? query.ranks
            : query.rank
              ? [query.rank]
              : undefined,
        tags: query.tags,
        qualificationCode: query.qualificationCode,
        includeHidden,
        memberSource: scope === 'all' ? undefined : scope,
      }
      if (query.status) {
        filters.status = query.status as MemberStatus
      }

      const result = await memberRepo.findPaginated({ page, limit }, filters)

      const totalPages = Math.ceil(result.total / limit)

      return {
        status: 200 as const,
        body: {
          members: result.members.map(toMemberResponse),
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
        body: toMemberResponse(member),
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
  createMember: async ({ body, req }: { body: CreateMemberInput; req: Request }) => {
    try {
      const actorLevel = req.member?.accountLevel ?? 0
      if (!req.member) {
        return {
          status: 401 as const,
          body: {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }
      }

      if (body.accountLevel !== undefined) {
        if (actorLevel < AccountLevel.ADMIN) {
          return {
            status: 403 as const,
            body: {
              error: 'FORBIDDEN',
              message: 'Only admin or developer accounts can set account levels',
            },
          }
        }
        if (body.accountLevel > actorLevel) {
          return {
            status: 403 as const,
            body: {
              error: 'FORBIDDEN',
              message: `Your account level (${actorLevel}) cannot assign level ${body.accountLevel}`,
            },
          }
        }
      }

      const member = await memberRepo.create({
        serviceNumber: body.serviceNumber,
        rank: body.rank,
        firstName: body.firstName,
        lastName: body.lastName,
        initials: body.middleInitial,
        divisionId: body.divisionId,
        email: body.email,
        mobilePhone: body.phoneNumber,
        memberSource: body.memberSource,
        memberTypeId: body.memberTypeId,
        memberStatusId: body.memberStatusId,
        badgeId: body.badgeId,
        accountLevel: body.accountLevel,
      })

      // Auto-sync qualifications for new member (non-blocking)
      try {
        await autoQualService.syncMember(member.id)
      } catch {
        // Non-blocking: don't fail create if sync errors
      }

      await logRequestAudit(auditRepo, req, {
        action: 'member_create',
        entityType: 'member',
        entityId: member.id,
        details: {
          memberName: formatAuditMemberName(member),
          serviceNumber: member.serviceNumber,
          divisionId: member.divisionId ?? null,
          badgeId: member.badgeId ?? null,
          accountLevel: member.accountLevel,
          memberTypeId: member.memberTypeId ?? null,
          memberStatusId: member.memberStatusId ?? null,
          memberSource: member.memberSource,
        },
      })

      return {
        status: 201 as const,
        body: toMemberResponse(member),
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
  updateMember: async ({
    params,
    body,
    req,
  }: {
    params: IdParam
    body: UpdateMemberInput
    req: Request
  }) => {
    try {
      const actorLevel = req.member?.accountLevel ?? 0
      if (!req.member) {
        return {
          status: 401 as const,
          body: {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }
      }

      if (body.accountLevel !== undefined) {
        if (actorLevel < AccountLevel.ADMIN) {
          return {
            status: 403 as const,
            body: {
              error: 'FORBIDDEN',
              message: 'Only admin or developer accounts can set account levels',
            },
          }
        }
        if (body.accountLevel > actorLevel) {
          return {
            status: 403 as const,
            body: {
              error: 'FORBIDDEN',
              message: `Your account level (${actorLevel}) cannot assign level ${body.accountLevel}`,
            },
          }
        }
      }

      const existingMember = await memberRepo.findById(params.id)
      if (!existingMember) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.id}' not found`,
          },
        }
      }

      await memberRepo.update(params.id, {
        serviceNumber: body.serviceNumber,
        rank: body.rank,
        firstName: body.firstName,
        lastName: body.lastName,
        initials: body.middleInitial,
        divisionId: body.divisionId,
        email: body.email,
        mobilePhone: body.phoneNumber,
        memberSource: body.memberSource,
        memberTypeId: body.memberTypeId,
        memberStatusId: body.memberStatusId,
        accountLevel: body.accountLevel,
      })

      if (body.badgeId !== undefined) {
        await badgeService.replaceMemberBadge(params.id, body.badgeId ?? null)
      }

      const finalMember = await memberRepo.findById(params.id)
      if (!finalMember) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.id}' not found`,
          },
        }
      }

      // Auto-sync qualifications if rank or division changed (non-blocking)
      if (body.rank !== undefined || body.divisionId !== undefined) {
        try {
          await autoQualService.syncMember(params.id)
        } catch {
          // Non-blocking: don't fail update if sync errors
        }
      }

      await logRequestAudit(auditRepo, req, {
        action: 'member_update',
        entityType: 'member',
        entityId: finalMember.id,
        details: {
          memberName: formatAuditMemberName(finalMember),
          serviceNumber: finalMember.serviceNumber,
          requestedChanges: body,
          previousState: {
            serviceNumber: existingMember.serviceNumber,
            rank: existingMember.rank,
            firstName: existingMember.firstName,
            lastName: existingMember.lastName,
            middleInitial: existingMember.initials ?? null,
            divisionId: existingMember.divisionId ?? null,
            email: existingMember.email ?? null,
            phoneNumber: existingMember.mobilePhone ?? null,
            badgeId: existingMember.badgeId ?? null,
            accountLevel: existingMember.accountLevel,
            memberSource: existingMember.memberSource,
            memberTypeId: existingMember.memberTypeId ?? null,
            memberStatusId: existingMember.memberStatusId ?? null,
          },
          currentState: {
            serviceNumber: finalMember.serviceNumber,
            rank: finalMember.rank,
            firstName: finalMember.firstName,
            lastName: finalMember.lastName,
            middleInitial: finalMember.initials ?? null,
            divisionId: finalMember.divisionId ?? null,
            email: finalMember.email ?? null,
            phoneNumber: finalMember.mobilePhone ?? null,
            badgeId: finalMember.badgeId ?? null,
            accountLevel: finalMember.accountLevel,
            memberSource: finalMember.memberSource,
            memberTypeId: finalMember.memberTypeId ?? null,
            memberStatusId: finalMember.memberStatusId ?? null,
          },
        },
      })

      return {
        status: 200 as const,
        body: toMemberResponse(finalMember),
      }
    } catch (error) {
      if (error instanceof ConflictError) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: error.message,
          },
        }
      }
      if (error instanceof NotFoundError) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.id}' not found`,
          },
        }
      }
      if (error instanceof Error && error.message.includes('protected Sentinel bootstrap member')) {
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
          message: error instanceof Error ? error.message : 'Failed to update member',
        },
      }
    }
  },

  /**
   * Delete member
   */
  deleteMember: async ({ params, req }: { params: IdParam; req: Request }) => {
    try {
      const existingMember = await memberRepo.findById(params.id)
      if (!existingMember) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.id}' not found`,
          },
        }
      }

      await memberService.deactivate(params.id)

      await logRequestAudit(auditRepo, req, {
        action: 'member_delete',
        entityType: 'member',
        entityId: params.id,
        details: {
          memberName: formatAuditMemberName(existingMember),
          serviceNumber: existingMember.serviceNumber,
          divisionId: existingMember.divisionId ?? null,
          badgeId: existingMember.badgeId ?? null,
          archived: true,
        },
      })

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Member archived successfully',
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
      if (error instanceof Error && error.message.includes('protected Sentinel bootstrap member')) {
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
        body: toMemberResponse(member),
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
