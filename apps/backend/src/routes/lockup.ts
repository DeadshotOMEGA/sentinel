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
  // ============================================================================
  // Status Endpoints
  // ============================================================================

  /**
   * Get current lockup status
   */
  getStatus: async () => {
    try {
      const status = await lockupService.getCurrentStatus()

      return {
        status: 200 as const,
        body: {
          date: status.date.toISOString().split('T')[0] ?? '',
          buildingStatus: status.buildingStatus,
          currentHolder: status.currentHolder,
          acquiredAt: status.acquiredAt?.toISOString() ?? null,
          securedAt: status.securedAt?.toISOString() ?? null,
          securedBy: status.securedByMember ?? null,
          isActive: status.isActive,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get lockup status',
        },
      }
    }
  },

  /**
   * Get lockup status for a specific date
   */
  getStatusByDate: async ({ params }) => {
    try {
      const status = await lockupService.getStatusByDate(params.date)

      if (!status) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `No lockup status found for date ${params.date}`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          date: status.date.toISOString().split('T')[0] ?? '',
          buildingStatus: status.buildingStatus,
          currentHolder: status.currentHolder,
          acquiredAt: status.acquiredAt?.toISOString() ?? null,
          securedAt: status.securedAt?.toISOString() ?? null,
          securedBy: status.securedByMember ?? null,
          isActive: status.isActive,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get lockup status',
        },
      }
    }
  },

  // ============================================================================
  // Transfer Endpoints
  // ============================================================================

  /**
   * Transfer lockup to another qualified member
   */
  transferLockup: async ({ body }) => {
    try {
      const result = await lockupService.transferLockup(body.toMemberId, body.reason, body.notes)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: `Lockup transferred to ${result.newHolder.firstName} ${result.newHolder.lastName}`,
          transfer: {
            id: result.transfer.id,
            fromMemberId: result.transfer.fromMemberId,
            toMemberId: result.transfer.toMemberId,
            transferredAt: result.transfer.transferredAt.toISOString(),
            reason: result.transfer.reason,
            notes: result.transfer.notes,
          },
          newHolder: result.newHolder,
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('No active lockup')) {
          return {
            status: 400 as const,
            body: {
              error: 'NO_ACTIVE_LOCKUP',
              message: error.message,
            },
          }
        }
        if (error.message.includes('not qualified')) {
          return {
            status: 403 as const,
            body: {
              error: 'NOT_QUALIFIED',
              message: error.message,
            },
          }
        }
        if (error.message.includes('not checked in')) {
          return {
            status: 400 as const,
            body: {
              error: 'NOT_CHECKED_IN',
              message: error.message,
            },
          }
        }
        if (error.message.includes('not found')) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: error.message,
            },
          }
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to transfer lockup',
        },
      }
    }
  },

  /**
   * Acquire lockup (for initial assignment or when no holder exists)
   */
  acquireLockup: async ({ params, body }) => {
    try {
      await lockupService.acquireLockup(params.id, body?.notes)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Lockup responsibility acquired successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already held')) {
          return {
            status: 409 as const,
            body: {
              error: 'ALREADY_HELD',
              message: error.message,
            },
          }
        }
        if (error.message.includes('not qualified')) {
          return {
            status: 403 as const,
            body: {
              error: 'NOT_QUALIFIED',
              message: error.message,
            },
          }
        }
        if (error.message.includes('not found')) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: error.message,
            },
          }
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to acquire lockup',
        },
      }
    }
  },

  // ============================================================================
  // Checkout Options Endpoint
  // ============================================================================

  /**
   * Get checkout options for a member
   */
  getCheckoutOptions: async ({ params }) => {
    try {
      const options = await lockupService.getCheckoutOptions(params.id)

      return {
        status: 200 as const,
        body: options,
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
          message: error instanceof Error ? error.message : 'Failed to get checkout options',
        },
      }
    }
  },

  // ============================================================================
  // History Endpoint
  // ============================================================================

  /**
   * Get lockup history (transfers and executions)
   */
  getHistory: async ({ query }) => {
    try {
      const history = await lockupService.getHistory(
        query.startDate,
        query.endDate,
        query.limit,
        query.offset
      )

      return {
        status: 200 as const,
        body: history,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get lockup history',
        },
      }
    }
  },

  // ============================================================================
  // Legacy/Execution Endpoints
  // ============================================================================

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
        organization: v.organization || 'Unknown',
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
      // Use new qualification-based check
      const canReceiveLockup = await lockupService.memberHoldsLockup(params.id)

      // Also check if member has lockup qualification (even if not currently holding)
      const options = await lockupService.getCheckoutOptions(params.id)
      const isQualified = options.availableOptions.includes('execute_lockup') || canReceiveLockup

      if (isQualified) {
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
          message: 'Member is not qualified to perform lockup',
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
          auditLogId: result.executionId, // Maps executionId to auditLogId for API compatibility
          stats: {
            membersCheckedOut: result.checkedOut.members.length,
            visitorsCheckedOut: result.checkedOut.visitors.length,
            totalCheckedOut: result.checkedOut.members.length + result.checkedOut.visitors.length,
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
