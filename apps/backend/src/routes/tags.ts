import { initServer } from '@ts-rest/express'
import { tagContract } from '@sentinel/contracts'
import { TagService } from '../services/tag-service.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()

const tagService = new TagService(getPrismaClient())

/**
 * Tags route implementation using ts-rest
 */
export const tagsRouter = s.router(tagContract, {
  /**
   * Get current lockup tag holder
   */
  getLockupHolder: async () => {
    try {
      const holder = await tagService.getCurrentLockupHolder()

      return {
        status: 200 as const,
        body: {
          holder,
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch lockup holder',
        },
      }
    }
  },

  /**
   * Transfer lockup tag to another member
   */
  transferLockupTag: async ({ body }) => {
    try {
      const result = await tagService.transferLockupTag(
        body.toMemberId,
        body.performedBy,
        body.performedByType,
        body.notes
      )

      if (!result) {
        return {
          status: 200 as const,
          body: {
            success: false,
            previousHolder: null,
            newHolder: {
              id: '',
              rank: '',
              firstName: '',
              lastName: '',
            },
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          success: result.success,
          previousHolder: result.previousHolder,
          newHolder: result.newHolder,
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
          message: error instanceof Error ? error.message : 'Failed to transfer lockup tag',
        },
      }
    }
  },
})
