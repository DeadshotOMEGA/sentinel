import { initContract } from '@ts-rest/core'
import * as v from 'valibot'
import {
  TrainingYearResponseSchema,
  TrainingYearListResponseSchema,
  CreateTrainingYearSchema,
  UpdateTrainingYearSchema,
  TrainingYearIdParamSchema,
  TrainingYearErrorResponseSchema,
} from '../schemas/training-year.schema.js'

const c = initContract()

/**
 * Training year contract
 *
 * Endpoints for managing fiscal training years with:
 * - Holiday exclusions (date ranges)
 * - Day exceptions (specific cancelled/off days)
 * - Current year flag
 */
export const trainingYearContract = c.router(
  {
    // GET /api/training-years - List all training years
    list: {
      method: 'GET',
      path: '/api/training-years',
      responses: {
        200: TrainingYearListResponseSchema,
        401: TrainingYearErrorResponseSchema,
        500: TrainingYearErrorResponseSchema,
      },
      summary: 'List all training years',
      description: 'Get all training years ordered by start date (newest first)',
    },

    // GET /api/training-years/current - Get current training year
    // IMPORTANT: This must be BEFORE /:id to prevent matching 'current' as an ID
    getCurrent: {
      method: 'GET',
      path: '/api/training-years/current',
      responses: {
        200: v.object({ trainingYear: TrainingYearResponseSchema }),
        401: TrainingYearErrorResponseSchema,
        404: TrainingYearErrorResponseSchema,
        500: TrainingYearErrorResponseSchema,
      },
      summary: 'Get current training year',
      description: 'Get the training year marked as current',
    },

    // GET /api/training-years/:id - Get training year by ID
    getById: {
      method: 'GET',
      path: '/api/training-years/:id',
      pathParams: TrainingYearIdParamSchema,
      responses: {
        200: v.object({ trainingYear: TrainingYearResponseSchema }),
        401: TrainingYearErrorResponseSchema,
        404: TrainingYearErrorResponseSchema,
        500: TrainingYearErrorResponseSchema,
      },
      summary: 'Get training year by ID',
      description: 'Get a specific training year by its unique identifier',
    },

    // POST /api/training-years - Create new training year
    create: {
      method: 'POST',
      path: '/api/training-years',
      body: CreateTrainingYearSchema,
      responses: {
        201: v.object({ trainingYear: TrainingYearResponseSchema }),
        400: TrainingYearErrorResponseSchema,
        401: TrainingYearErrorResponseSchema,
        403: TrainingYearErrorResponseSchema,
        500: TrainingYearErrorResponseSchema,
      },
      summary: 'Create training year',
      description:
        'Create a new training year with holiday exclusions and day exceptions. Admin role required.',
    },

    // PUT /api/training-years/:id - Update training year
    update: {
      method: 'PUT',
      path: '/api/training-years/:id',
      pathParams: TrainingYearIdParamSchema,
      body: UpdateTrainingYearSchema,
      responses: {
        200: v.object({ trainingYear: TrainingYearResponseSchema }),
        400: TrainingYearErrorResponseSchema,
        401: TrainingYearErrorResponseSchema,
        403: TrainingYearErrorResponseSchema,
        404: TrainingYearErrorResponseSchema,
        500: TrainingYearErrorResponseSchema,
      },
      summary: 'Update training year',
      description: 'Update an existing training year. Admin role required.',
    },

    // PUT /api/training-years/:id/set-current - Set as current training year
    setCurrent: {
      method: 'PUT',
      path: '/api/training-years/:id/set-current',
      pathParams: TrainingYearIdParamSchema,
      body: c.type<undefined>(),
      responses: {
        200: v.object({ trainingYear: TrainingYearResponseSchema }),
        401: TrainingYearErrorResponseSchema,
        403: TrainingYearErrorResponseSchema,
        404: TrainingYearErrorResponseSchema,
        500: TrainingYearErrorResponseSchema,
      },
      summary: 'Set current training year',
      description:
        'Mark a training year as current. Automatically unsets other current years via database trigger. Admin role required.',
    },

    // DELETE /api/training-years/:id - Delete training year
    delete: {
      method: 'DELETE',
      path: '/api/training-years/:id',
      pathParams: TrainingYearIdParamSchema,
      body: c.type<undefined>(),
      responses: {
        204: c.type<void>(),
        400: TrainingYearErrorResponseSchema,
        401: TrainingYearErrorResponseSchema,
        403: TrainingYearErrorResponseSchema,
        404: TrainingYearErrorResponseSchema,
        500: TrainingYearErrorResponseSchema,
      },
      summary: 'Delete training year',
      description:
        'Delete a training year. Cannot delete the current training year. Admin role required.',
    },
  },
  {
    pathPrefix: '',
  }
)
