import { initServer } from '@ts-rest/express'
import { trainingYearContract } from '@sentinel/contracts'
import { TrainingYearRepository } from '../repositories/training-year-repository.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()
const trainingYearRepo = new TrainingYearRepository(getPrismaClient())

/**
 * Training year routes
 *
 * Manages fiscal training years with holiday exclusions and day exceptions.
 * Only one training year can be marked as current at a time.
 */
export const trainingYearsRouter = s.router(trainingYearContract, {
  /**
   * GET /api/training-years - List all training years
   */
  list: async () => {
    try {
      const trainingYears = await trainingYearRepo.findAll()

      return {
        status: 200 as const,
        body: {
          trainingYears: trainingYears.map(toApiFormat),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to fetch training years',
        },
      }
    }
  },

  /**
   * GET /api/training-years/current - Get current training year
   */
  getCurrent: async () => {
    try {
      const trainingYear = await trainingYearRepo.findCurrent()

      if (!trainingYear) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: 'No current training year set',
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          trainingYear: toApiFormat(trainingYear),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to fetch current training year',
        },
      }
    }
  },

  /**
   * GET /api/training-years/:id - Get training year by ID
   */
  getById: async ({ params }) => {
    try {
      const trainingYear = await trainingYearRepo.findById(params.id)

      if (!trainingYear) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Training year with ID '${params.id}' not found`,
          },
        }
      }

      return {
        status: 200 as const,
        body: {
          trainingYear: toApiFormat(trainingYear),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to fetch training year',
        },
      }
    }
  },

  /**
   * POST /api/training-years - Create new training year
   */
  create: async ({ body }) => {
    try {
      const trainingYear = await trainingYearRepo.create({
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        holidayExclusions: body.holidayExclusions || [],
        dayExceptions: body.dayExceptions || [],
        isCurrent: body.isCurrent || false,
      })

      return {
        status: 201 as const,
        body: {
          trainingYear: toApiFormat(trainingYear),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to create training year',
        },
      }
    }
  },

  /**
   * PUT /api/training-years/:id - Update training year
   */
  update: async ({ params, body }) => {
    try {
      // Check if training year exists
      const existing = await trainingYearRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Training year with ID '${params.id}' not found`,
          },
        }
      }

      // Build update data
      const updateData: any = {}
      if (body.name !== undefined) updateData.name = body.name
      if (body.startDate !== undefined)
        updateData.startDate = new Date(body.startDate)
      if (body.endDate !== undefined)
        updateData.endDate = new Date(body.endDate)
      if (body.holidayExclusions !== undefined)
        updateData.holidayExclusions = body.holidayExclusions
      if (body.dayExceptions !== undefined)
        updateData.dayExceptions = body.dayExceptions
      if (body.isCurrent !== undefined) updateData.isCurrent = body.isCurrent

      // Check if there are any fields to update
      if (Object.keys(updateData).length === 0) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: 'No fields to update',
          },
        }
      }

      const trainingYear = await trainingYearRepo.update(params.id, updateData)

      return {
        status: 200 as const,
        body: {
          trainingYear: toApiFormat(trainingYear),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to update training year',
        },
      }
    }
  },

  /**
   * PUT /api/training-years/:id/set-current - Set as current training year
   */
  setCurrent: async ({ params }) => {
    try {
      // Check if training year exists
      const existing = await trainingYearRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Training year with ID '${params.id}' not found`,
          },
        }
      }

      // Database trigger will automatically unset other current years
      const trainingYear = await trainingYearRepo.setCurrent(params.id)

      return {
        status: 200 as const,
        body: {
          trainingYear: toApiFormat(trainingYear),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to set current training year',
        },
      }
    }
  },

  /**
   * DELETE /api/training-years/:id - Delete training year
   */
  delete: async ({ params }) => {
    try {
      // Check if training year exists
      const existing = await trainingYearRepo.findById(params.id)
      if (!existing) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Training year with ID '${params.id}' not found`,
          },
        }
      }

      // Prevent deletion of current training year
      if (existing.isCurrent) {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message:
              'Cannot delete the current training year. Set another year as current first.',
          },
        }
      }

      await trainingYearRepo.delete(params.id)

      return {
        status: 204 as const,
        body: undefined,
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to delete training year',
        },
      }
    }
  },
})

/**
 * Convert TrainingYear database model to API response format
 */
function toApiFormat(trainingYear: any) {
  return {
    id: trainingYear.id,
    name: trainingYear.name,
    startDate: trainingYear.startDate.toISOString().split('T')[0], // Date only
    endDate: trainingYear.endDate.toISOString().split('T')[0], // Date only
    holidayExclusions: Array.isArray(trainingYear.holidayExclusions)
      ? trainingYear.holidayExclusions
      : JSON.parse(trainingYear.holidayExclusions || '[]'),
    dayExceptions: Array.isArray(trainingYear.dayExceptions)
      ? trainingYear.dayExceptions
      : JSON.parse(trainingYear.dayExceptions || '[]'),
    isCurrent: trainingYear.isCurrent,
    createdAt: trainingYear.createdAt.toISOString(),
    updatedAt: trainingYear.updatedAt.toISOString(),
  }
}
