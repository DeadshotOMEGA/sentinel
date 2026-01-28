import { initContract } from '@ts-rest/core'
import {
  ExecuteLockupSchema,
  LockupPresentDataResponseSchema,
  ExecuteLockupResponseSchema,
  CheckLockupAuthResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
  LockupStatusResponseSchema,
  DateParamSchema,
  TransferLockupSchema,
  TransferLockupResponseSchema,
  CheckoutOptionsResponseSchema,
  LockupHistoryQuerySchema,
  LockupHistoryResponseSchema,
  SuccessResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Lockup API contract
 *
 * Defines all lockup-related endpoints with request/response schemas.
 * The lockup system tracks who holds responsibility for securing the building
 * and manages transfers between qualified members.
 */
export const lockupContract = c.router({
  // ============================================================================
  // Status Endpoints
  // ============================================================================

  /**
   * Get current lockup status
   */
  getStatus: {
    method: 'GET',
    path: '/api/lockup/status',
    responses: {
      200: LockupStatusResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get current lockup status',
    description: 'Get current lockup status including holder, building state, and acquisition time',
  },

  /**
   * Get lockup status for a specific date
   */
  getStatusByDate: {
    method: 'GET',
    path: '/api/lockup/status/:date',
    pathParams: DateParamSchema,
    responses: {
      200: LockupStatusResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get lockup status for date',
    description: 'Get lockup status for a specific operational date (YYYY-MM-DD format)',
  },

  // ============================================================================
  // Transfer Endpoints
  // ============================================================================

  /**
   * Transfer lockup to another qualified member
   */
  transferLockup: {
    method: 'POST',
    path: '/api/lockup/transfer',
    body: TransferLockupSchema,
    responses: {
      200: TransferLockupResponseSchema,
      400: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Transfer lockup responsibility',
    description: 'Transfer lockup to another qualified and checked-in member',
  },

  /**
   * Acquire lockup (for initial assignment or when no holder exists)
   */
  acquireLockup: {
    method: 'POST',
    path: '/api/lockup/acquire/:id',
    pathParams: IdParamSchema,
    body: c.type<{ notes?: string }>(),
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Acquire lockup responsibility',
    description: 'Acquire lockup when no one currently holds it (requires qualification)',
  },

  // ============================================================================
  // Checkout Options Endpoint
  // ============================================================================

  /**
   * Get checkout options for a member
   */
  getCheckoutOptions: {
    method: 'GET',
    path: '/api/lockup/checkout-options/:id',
    pathParams: IdParamSchema,
    responses: {
      200: CheckoutOptionsResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get checkout options',
    description:
      'Get available checkout options for a member (normal, transfer, or execute lockup)',
  },

  // ============================================================================
  // History Endpoint
  // ============================================================================

  /**
   * Get lockup history (transfers and executions)
   */
  getHistory: {
    method: 'GET',
    path: '/api/lockup/history',
    query: LockupHistoryQuerySchema,
    responses: {
      200: LockupHistoryResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get lockup history',
    description: 'Get history of lockup transfers and executions with optional date filtering',
  },

  // ============================================================================
  // Legacy/Execution Endpoints (kept for backwards compatibility)
  // ============================================================================

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
   * @deprecated Use qualification system instead
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
    description:
      'Check if a member is authorized to perform building lockup (uses qualification system)',
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
    description: 'Bulk checkout all present members and visitors (requires lockup holder)',
  },
})
