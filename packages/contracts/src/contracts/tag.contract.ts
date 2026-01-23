import { initContract } from '@ts-rest/core'
import {
  TransferLockupTagSchema,
  TransferLockupTagResponseSchema,
  GetLockupHolderResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Tag API contract
 *
 * Defines all tag-related endpoints with request/response schemas
 * Currently focused on Lockup tag management
 */
export const tagContract = c.router({
  /**
   * Get current lockup tag holder
   */
  getLockupHolder: {
    method: 'GET',
    path: '/api/tags/lockup/holder',
    responses: {
      200: GetLockupHolderResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get lockup tag holder',
    description: 'Get the member who currently holds the Lockup tag',
  },

  /**
   * Transfer lockup tag to another member
   */
  transferLockupTag: {
    method: 'POST',
    path: '/api/tags/lockup/transfer',
    body: TransferLockupTagSchema,
    responses: {
      200: TransferLockupTagResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Transfer lockup tag',
    description: 'Transfer the Lockup tag from current holder to a new member',
  },
})
