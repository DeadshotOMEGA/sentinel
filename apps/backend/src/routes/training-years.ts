import { initServer } from '@ts-rest/express'
import { trainingYearContract, type TrainingYearResponse } from '@sentinel/contracts'
import { TrainingYearRepository } from '../repositories/training-year-repository.js'
import { getPrismaClient } from '../lib/database.js'
import type { TrainingYear } from '@sentinel/database'

const s = initServer()
const trainingYearRepo = new TrainingYearRepository(getPrismaClient())

/**
 * Convert TrainingYear from repository to API response format
 */
function toApiFormat(trainingYear: TrainingYear): TrainingYearResponse {
  const startDate = trainingYear.startDate.toISOString().split('T')[0]
  const endDate = trainingYear.endDate.toISOString().split('T')[0]

  // Ensure we have valid date strings
  if (!startDate || !endDate) {
    throw new Error('Invalid date format in training year')
  }

  return {
    id: trainingYear.id,
    name: trainingYear.name,
    startDate,
    endDate,
    holidayExclusions: Array.isArray(trainingYear.holidayExclusions)
      ? (trainingYear.holidayExclusions as TrainingYearResponse['holidayExclusions'])
      : [],
    dayExceptions: Array.isArray(trainingYear.dayExceptions)
      ? (trainingYear.dayExceptions as TrainingYearResponse['dayExceptions'])
      : [],
    isCurrent: trainingYear.isCurrent,
    createdAt: trainingYear.createdAt.toISOString(),
    updatedAt: trainingYear.updatedAt.toISOString(),
  }
}

/**
 * Training Years routes
 *
 * Manages fiscal training years with holiday exclusions and day exceptions.
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
          message: error instanceof Error ? error.message : 'Failed to fetch training years',
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
          message: error instanceof Error ? error.message : 'Failed to fetch current training year',
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
          message: error instanceof Error ? error.message : 'Failed to fetch training year',
        },
      }
    }
  },

  /**
   * POST /api/training-years - Create new training year
   */
  create: async ({ body }) => {
    try {
      const trainingYear = await trainingYearRepo.create(body)

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
          message: error instanceof Error ? error.message : 'Failed to create training year',
        },
      }
    }
  },

  /**
   * PUT /api/training-years/:id - Update training year
   */
  update: async ({ params, body }) => {
    try {
      const trainingYear = await trainingYearRepo.update(params.id, body)

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
          message: error instanceof Error ? error.message : 'Failed to update training year',
        },
      }
    }
  },

  /**
   * PUT /api/training-years/:id/set-current - Set as current training year
   */
  setCurrent: async ({ params }) => {
    try {
      const trainingYear = await trainingYearRepo.setCurrent(params.id)

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
          message: error instanceof Error ? error.message : 'Failed to set current training year',
        },
      }
    }
  },

  /**
   * DELETE /api/training-years/:id - Delete training year
   */
  delete: async ({ params }) => {
    try {
      await trainingYearRepo.delete(params.id)

      return {
        status: 204 as const,
        body: undefined,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Training year with ID '${params.id}' not found`,
          },
        }
      }

      if (error instanceof Error && error.message.includes('current')) {
        return {
          status: 400 as const,
          body: {
            error: 'INVALID_OPERATION',
            message: 'Cannot delete the current training year',
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete training year',
        },
      }
    }
  },
})
