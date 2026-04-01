import { initContract } from '@ts-rest/core'
import { ErrorResponseSchema, SystemStatusResponseSchema } from '../schemas/index.js'

const c = initContract()

export const systemStatusContract = c.router(
  {
    getSystemStatus: {
      method: 'GET',
      path: '/api/system-status',
      responses: {
        200: SystemStatusResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Get authenticated system status',
      description:
        'Return backend/database status, host network telemetry, and live remote-system activity for the authenticated Sentinel UI.',
    },
  },
  {
    pathPrefix: '',
  }
)
