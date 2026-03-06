import { initServer } from '@ts-rest/express'
import { ddsContract } from '@sentinel/contracts'
import type {
  DdsAuditLogQuery,
  AssignDdsInput,
  SetTodayDdsInput,
  TransferDdsInput,
  ReleaseDdsInput,
  IdParam,
} from '@sentinel/contracts'
import type { Request } from 'express'
import { DdsService } from '../services/dds-service.js'
import { PresenceService } from '../services/presence-service.js'
import { getPrismaClient } from '../lib/database.js'
import { AccountLevel } from '../middleware/roles.js'

const s = initServer()

const ddsService = new DdsService(getPrismaClient())
const presenceService = new PresenceService(getPrismaClient())

interface DdsAssignmentData {
  id: string
  memberId: string
  assignedDate: Date | string
  acceptedAt: Date | string | null
  releasedAt: Date | string | null
  transferredTo: string | null
  assignedBy: string | null
  status: string
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  member: { id: string; firstName: string; lastName: string; rank: string; division: string | null }
  assignedByAdminName: string | null
}

/**
 * Helper to transform DDS assignment to API format
 */
function toApiFormat(assignment: DdsAssignmentData) {
  return {
    id: String(assignment.id),
    memberId: String(assignment.memberId),
    assignedDate:
      assignment.assignedDate instanceof Date
        ? assignment.assignedDate.toISOString()
        : String(assignment.assignedDate),
    acceptedAt:
      assignment.acceptedAt instanceof Date
        ? assignment.acceptedAt.toISOString()
        : assignment.acceptedAt
          ? String(assignment.acceptedAt)
          : null,
    releasedAt:
      assignment.releasedAt instanceof Date
        ? assignment.releasedAt.toISOString()
        : assignment.releasedAt
          ? String(assignment.releasedAt)
          : null,
    transferredTo: assignment.transferredTo ? String(assignment.transferredTo) : null,
    assignedBy: assignment.assignedBy ? String(assignment.assignedBy) : null,
    status: String(assignment.status) as 'pending' | 'active' | 'transferred' | 'released',
    notes: assignment.notes ? String(assignment.notes) : null,
    createdAt:
      assignment.createdAt instanceof Date
        ? assignment.createdAt.toISOString()
        : String(assignment.createdAt),
    updatedAt:
      assignment.updatedAt instanceof Date
        ? assignment.updatedAt.toISOString()
        : String(assignment.updatedAt),
    member: assignment.member,
    assignedByAdminName: assignment.assignedByAdminName
      ? String(assignment.assignedByAdminName)
      : null,
  }
}

/**
 * DDS route implementation using ts-rest
 */
export const ddsRouter = s.router(ddsContract, {
  /**
   * Get today's DDS assignment and next week's DDS
   */
  getCurrentDds: async () => {
    try {
      const [assignment, nextDds] = await Promise.all([
        ddsService.getCurrentDds(),
        ddsService.getNextWeekDds(),
      ])

      const isDdsOnSite = assignment
        ? await presenceService.isMemberPresent(assignment.memberId)
        : false

      return {
        status: 200 as const,
        body: {
          assignment: assignment ? toApiFormat(assignment) : null,
          nextDds,
          isDdsOnSite,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch current DDS',
        },
      }
    }
  },

  /**
   * Check if DDS exists for today
   */
  checkDdsExists: async () => {
    try {
      const exists = await ddsService.hasDdsForToday()

      return {
        status: 200 as const,
        body: {
          exists,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check DDS exists',
        },
      }
    }
  },

  /**
   * Get DDS audit log
   */
  getAuditLog: async ({ query }: { query: DdsAuditLogQuery }) => {
    try {
      const limit = query.limit || 50
      const logs = await ddsService.getAuditLog(query.memberId, limit)

      return {
        status: 200 as const,
        body: {
          logs: logs.map((log) => ({
            id: log.id,
            memberId: log.memberId,
            tagName: log.tagName,
            action: log.action,
            fromMemberId: log.fromMemberId,
            toMemberId: log.toMemberId,
            performedBy: log.performedBy,
            performedByType: log.performedByType,
            timestamp: log.timestamp.toISOString(),
            notes: log.notes,
          })),
          count: logs.length,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch audit log',
        },
      }
    }
  },

  getKioskResponsibilityState: async ({ params }: { params: IdParam }) => {
    try {
      const state = await ddsService.getKioskResponsibilityState(params.id)

      return {
        status: 200 as const,
        body: state,
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

      if (error instanceof Error && error.message.includes('Invalid')) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to fetch kiosk responsibility state',
        },
      }
    }
  },

  /**
   * Member self-accepts DDS at kiosk
   */
  acceptDds: async ({ params }: { params: IdParam }) => {
    try {
      const assignment = await ddsService.acceptDds(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'DDS accepted successfully',
          assignment: toApiFormat(assignment),
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

      if (
        error instanceof Error &&
        (error.message.includes('already been assigned') ||
          error.message.includes('already been accepted'))
      ) {
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
        (error.message.includes('must be checked in') || error.message.includes('qualification'))
      ) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to accept DDS',
        },
      }
    }
  },

  setTodayDds: async ({ body, req }: { body: SetTodayDdsInput; req: Request }) => {
    try {
      if (!req.member) {
        return {
          status: 401 as const,
          body: {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }
      }

      if ((req.member.accountLevel ?? 0) < AccountLevel.ADMIN) {
        return {
          status: 403 as const,
          body: {
            error: 'FORBIDDEN',
            message: 'Admin access required',
          },
        }
      }

      const assignment = await ddsService.setTodayDds(body.memberId, req.member.id, body.notes)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: "Today's DDS updated successfully",
          assignment: toApiFormat(assignment),
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

      if (
        error instanceof Error &&
        (error.message.includes('must be checked in') || error.message.includes('qualification'))
      ) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }

      if (error instanceof Error && error.message.includes('already been accepted')) {
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
          message: error instanceof Error ? error.message : "Failed to update today's DDS",
        },
      }
    }
  },

  /**
   * Admin assigns DDS to a member
   */
  assignDds: async ({ body, req }: { body: AssignDdsInput; req: Request }) => {
    try {
      const adminId = req.member?.id ?? 'system'

      const assignment = await ddsService.assignDds(body.memberId, adminId, body.notes)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'DDS assigned successfully',
          assignment: toApiFormat(assignment),
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

      if (error instanceof Error && error.message.includes('already been assigned')) {
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
        (error.message.includes('must be checked in') || error.message.includes('qualification'))
      ) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to assign DDS',
        },
      }
    }
  },

  /**
   * Transfer DDS to another member
   */
  transferDds: async ({ body, req }: { body: TransferDdsInput; req: Request }) => {
    try {
      const adminId = req.member?.id ?? 'system'

      const assignment = await ddsService.transferDds(body.toMemberId, adminId, body.notes)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'DDS transferred successfully',
          assignment: toApiFormat(assignment),
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

      if (error instanceof Error && error.message.includes('Cannot transfer')) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }

      if (
        error instanceof Error &&
        (error.message.includes('must be checked in') || error.message.includes('qualification'))
      ) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: error.message,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to transfer DDS',
        },
      }
    }
  },

  /**
   * Release DDS role
   */
  releaseDds: async ({ body, req }: { body: ReleaseDdsInput; req: Request }) => {
    try {
      const adminId = req.member?.id ?? 'system'

      await ddsService.releaseDds(adminId, body.notes)
      const nextDds = await ddsService.getNextWeekDds()

      return {
        status: 200 as const,
        body: {
          assignment: null,
          nextDds,
          isDdsOnSite: false,
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
          message: error instanceof Error ? error.message : 'Failed to release DDS',
        },
      }
    }
  },
})
