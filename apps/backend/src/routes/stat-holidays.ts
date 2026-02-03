import { initServer } from '@ts-rest/express'
import { statHolidayContract } from '@sentinel/contracts'
import type {
  StatHolidayQuery,
  CreateStatHolidayInput,
  UpdateStatHolidayInput,
} from '@sentinel/contracts'
import { StatHolidayService } from '../services/stat-holiday-service.js'
import { getPrismaClient } from '../lib/database.js'
import { NotFoundError, ConflictError } from '../middleware/error-handler.js'

const s = initServer()

const statHolidayService = new StatHolidayService(getPrismaClient())

// ============================================================================
// Helper Functions
// ============================================================================

function holidayToApiFormat(holiday: {
  id: string
  date: Date
  name: string
  province: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: holiday.id,
    date: holiday.date.toISOString().substring(0, 10),
    name: holiday.name,
    province: holiday.province,
    isActive: holiday.isActive,
    createdAt: holiday.createdAt.toISOString(),
    updatedAt: holiday.updatedAt.toISOString(),
  }
}

function handleError(error: unknown) {
  if (error instanceof NotFoundError) {
    return {
      status: 404 as const,
      body: { error: 'NOT_FOUND', message: error.message },
    }
  }
  if (error instanceof ConflictError) {
    return {
      status: 409 as const,
      body: { error: 'CONFLICT', message: error.message },
    }
  }
  return {
    status: 500 as const,
    body: {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    },
  }
}

// ============================================================================
// Router
// ============================================================================

export const statHolidaysRouter = s.router(statHolidayContract, {
  // ==========================================================================
  // List & Query Endpoints
  // ==========================================================================

  getAll: async ({ query }: { query: StatHolidayQuery }) => {
    try {
      const result = await statHolidayService.getAll({
        year: query.year,
        province: query.province,
        activeOnly: query.activeOnly,
      })
      return {
        status: 200 as const,
        body: {
          holidays: result.holidays.map(holidayToApiFormat),
          total: result.total,
        },
      }
    } catch (error) {
      return handleError(error)
    }
  },

  isHoliday: async ({ params }: { params: { date: string } }) => {
    try {
      const result = await statHolidayService.isHoliday(params.date)
      return {
        status: 200 as const,
        body: {
          isHoliday: result.isHoliday,
          holiday: result.holiday ? holidayToApiFormat(result.holiday) : null,
        },
      }
    } catch (error) {
      return handleError(error)
    }
  },

  getById: async ({ params }: { params: { id: string } }) => {
    try {
      const holiday = await statHolidayService.getById(params.id)
      return {
        status: 200 as const,
        body: holidayToApiFormat(holiday),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  // ==========================================================================
  // CRUD Endpoints
  // ==========================================================================

  create: async ({ body }: { body: CreateStatHolidayInput }) => {
    try {
      const holiday = await statHolidayService.create({
        date: body.date,
        name: body.name,
        province: body.province,
        isActive: body.isActive,
      })
      return {
        status: 201 as const,
        body: holidayToApiFormat(holiday),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  update: async ({ params, body }: { params: { id: string }; body: UpdateStatHolidayInput }) => {
    try {
      const holiday = await statHolidayService.update(params.id, {
        date: body.date,
        name: body.name,
        province: body.province,
        isActive: body.isActive,
      })
      return {
        status: 200 as const,
        body: holidayToApiFormat(holiday),
      }
    } catch (error) {
      return handleError(error)
    }
  },

  delete: async ({ params }: { params: { id: string } }) => {
    try {
      await statHolidayService.delete(params.id)
      return {
        status: 200 as const,
        body: { success: true, message: 'Stat holiday deleted successfully' },
      }
    } catch (error) {
      return handleError(error)
    }
  },
})
