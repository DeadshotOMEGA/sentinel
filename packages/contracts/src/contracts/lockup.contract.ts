import { initContract } from '@ts-rest/core'
import {
  ExecuteLockupSchema,
  LockupPresentDataResponseSchema,
  ExecuteLockupResponseSchema,
  CheckLockupAuthResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Lockup API contract
 *
 * Defines all lockup-related endpoints with request/response schemas
 */
export const lockupContract = c.router({
  /**
   * Get all present people for lockup confirmation
   */
  getPresentForLockup: {
    method: 'GET',
    path: '/api/lockup/present',
    responses: {
      200: LockupPresentDataResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get present people for lockup',
    description: 'Get all currently present members and visitors for lockup confirmation screen',
  },

  /**
   * Check if member is authorized to perform lockup
   */
  checkLockupAuth: {
    method: 'GET',
    path: '/api/lockup/check-auth/:id',
    pathParams: IdParamSchema,
    responses: {
      200: CheckLockupAuthResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Check lockup authorization',
    description: 'Check if a member has the Lockup tag and is authorized to perform building lockup',
  },

  /**
   * Execute building lockup (bulk checkout all present people)
   */
  executeLockup: {
    method: 'POST',
    path: '/api/lockup/execute/:id',
    pathParams: IdParamSchema,
    body: ExecuteLockupSchema,
    responses: {
      200: ExecuteLockupResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Execute building lockup',
    description: 'Bulk checkout all present members and visitors (requires Lockup tag)',
  },
})
