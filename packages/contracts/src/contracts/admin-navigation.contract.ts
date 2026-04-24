import { initContract } from '@ts-rest/core'
import {
  AdminNavigationEventResponseSchema,
  CreateAdminNavigationEventSchema,
  ErrorResponseSchema,
} from '../schemas/index.js'

const c = initContract()

export const adminNavigationContract = c.router({
  recordAdminNavigationEvent: {
    method: 'POST',
    path: '/api/admin-navigation-events',
    body: CreateAdminNavigationEventSchema,
    responses: {
      201: AdminNavigationEventResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Record admin navigation event',
    description:
      'Record aggregate, anonymous admin navigation metrics using low-cardinality route and action identifiers.',
  },
})
