import { initContract } from '@ts-rest/core'
import {
  OperationalTimingsResponseSchema,
  UpdateOperationalTimingsSchema,
  OperationalTimingsErrorResponseSchema,
} from '../schemas/operational-timing.schema.js'

const c = initContract()

/**
 * Operational Timings API contract
 *
 * Manages app-wide operational timing configuration used by scheduler jobs,
 * operational-day calculations, duty-watch logic, and alert rate-limits.
 */
export const operationalTimingContract = c.router(
  {
    getOperationalTimings: {
      method: 'GET',
      path: '/api/operational-timings',
      responses: {
        200: OperationalTimingsResponseSchema,
        401: OperationalTimingsErrorResponseSchema,
        500: OperationalTimingsErrorResponseSchema,
      },
      summary: 'Get operational timing settings',
      description:
        'Get effective operational timing settings with metadata (source and last update timestamp).',
    },

    updateOperationalTimings: {
      method: 'PUT',
      path: '/api/operational-timings',
      body: UpdateOperationalTimingsSchema,
      responses: {
        200: OperationalTimingsResponseSchema,
        400: OperationalTimingsErrorResponseSchema,
        401: OperationalTimingsErrorResponseSchema,
        403: OperationalTimingsErrorResponseSchema,
        500: OperationalTimingsErrorResponseSchema,
      },
      summary: 'Update operational timing settings',
      description:
        'Update operational timing settings, persist them, and apply runtime behavior changes immediately.',
    },
  },
  {
    pathPrefix: '',
  }
)
