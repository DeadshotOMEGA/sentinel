import { initContract } from '@ts-rest/core'
import {
  ErrorResponseSchema,
  StartSystemUpdateResponseSchema,
  StartSystemUpdateSchema,
  SystemUpdateJobParamsSchema,
  SystemUpdateJobSchema,
  SystemUpdateStatusQuerySchema,
  SystemUpdateStatusResponseSchema,
  SystemUpdateTraceResponseSchema,
} from '../schemas/index.js'

const c = initContract()

export const systemUpdateContract = c.router(
  {
    getSystemUpdateStatus: {
      method: 'GET',
      path: '/api/admin/system/update',
      query: SystemUpdateStatusQuerySchema,
      responses: {
        200: SystemUpdateStatusResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Get system update status',
      description:
        'Return the current Sentinel appliance version, latest available release metadata, and the persisted updater job state.',
    },

    startSystemUpdate: {
      method: 'POST',
      path: '/api/admin/system/update',
      body: StartSystemUpdateSchema,
      responses: {
        202: StartSystemUpdateResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Start a Sentinel system update',
      description:
        'Validate and queue a host-side Sentinel appliance update request for a specific trusted version tag.',
    },

    getSystemUpdateTrace: {
      method: 'GET',
      path: '/api/admin/system/update/trace',
      responses: {
        200: SystemUpdateTraceResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Get the active system update trace log',
      description:
        'Return the active unified Sentinel update trace log that records the current or most recent host-side update flow.',
    },

    getSystemUpdateJob: {
      method: 'GET',
      path: '/api/admin/system/update/:jobId',
      pathParams: SystemUpdateJobParamsSchema,
      responses: {
        200: SystemUpdateJobSchema,
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Get a specific Sentinel update job',
      description:
        'Return the sanitized persisted state for a specific Sentinel appliance update job.',
    },
  },
  {
    pathPrefix: '',
  }
)
