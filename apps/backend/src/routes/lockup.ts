import { initServer } from '@ts-rest/express'
import { lockupContract } from '@sentinel/contracts'
import { LockupService } from '../services/lockup-service.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()

const lockupService = new LockupService(getPrismaClient())

/**
 * Lockup route implementation using ts-rest
 */
export const lockupRouter = s.router(lockupContract, {
  /**
   * Get all present people for lockup confirmation
   */
  getPresentForLockup: async () => {
    try {
      const presentData = await lockupService.getPresentMembersForLockup()

      const membersFormatted = presentData.members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        rank: m.rank,
        division: m.division,
        divisionId: m.divisionId,
        memberType: m.memberType,
        mess: m.mess,
        checkedInAt: m.checkedInAt,
        kioskId: m.kioskId,
      }))

      const visitorsFormatted = presentData.visitors.map((v) => ({
        id: v.id,
        name: v.name,
        organization: v.organization,
        visitType: v.visitType,
        checkInTime: v.checkInTime.toISOString(),
      }))

      return {
        status: 200 as const,
        body: {
          members: membersFormatted,
          visitors: visitorsFormatted,
          totalCount: membersFormatted.length + visitorsFormatted.length,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to fetch present people for lockup',
        },
      }
    }
  },

  /**
   * Check if member is authorized to perform lockup
   */
  checkLockupAuth: async ({ params }) => {
    try {
      const hasLockupTag = await lockupService.checkMemberHasLockupTag(params.id)

      if (hasLockupTag) {
        return {
          status: 200 as const,
          body: {
            authorized: true,
            message: 'Member is authorized to perform lockup',
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          authorized: false,
          message: 'Member does not have the Lockup tag',
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
          message: error instanceof Error ? error.message : 'Failed to check lockup authorization',
        },
      }
    }
  },

  /**
   * Execute building lockup
   */
  executeLockup: async ({ params, body }) => {
    try {
      const result = await lockupService.executeLockup(params.id, body.note)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: `Lockup executed successfully. Checked out ${result.checkedOut.members.length} members and ${result.checkedOut.visitors.length} visitors.`,
          checkedOut: result.checkedOut,
          auditLogId: result.auditLogId,
          stats: {
            membersCheckedOut: result.checkedOut.members.length,
            visitorsCheckedOut: result.checkedOut.visitors.length,
            totalCheckedOut:
              result.checkedOut.members.length + result.checkedOut.visitors.length,
          },
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

      if (error instanceof Error && error.message.includes('not authorized')) {
        return {
          status: 400 as const,
          body: {
            error: 'UNAUTHORIZED',
            message: error.message,
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute lockup',
        },
      }
    }
  },
})
