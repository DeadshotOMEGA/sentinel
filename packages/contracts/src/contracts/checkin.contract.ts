import { initContract } from '@ts-rest/core'
import {
  CreateCheckinSchema,
  BulkCreateCheckinsSchema,
  UpdateCheckinSchema,
  CheckinWithMemberResponseSchema,
  CheckinListQuerySchema,
  CheckinListResponseSchema,
  PresenceStatusResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
  SuccessResponseSchema,
  BulkOperationResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Checkin API contract
 *
 * Defines all checkin-related endpoints with request/response schemas
 */
export const checkinContract = c.router({
  /**
   * Get all checkins with pagination and filtering
   */
  getCheckins: {
    method: 'GET',
    path: '/api/checkins',
    query: CheckinListQuerySchema,
    responses: {
      200: CheckinListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all checkins',
    description:
      'Get paginated list of checkins with optional filtering by member, division, date range, and direction',
  },

  /**
   * Get single checkin by ID
   */
  getCheckinById: {
    method: 'GET',
    path: '/api/checkins/:id',
    pathParams: IdParamSchema,
    responses: {
      200: CheckinWithMemberResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get checkin by ID',
    description: 'Retrieve a single checkin by its unique ID',
  },

  /**
   * Create new checkin
   */
  createCheckin: {
    method: 'POST',
    path: '/api/checkins',
    body: CreateCheckinSchema,
    responses: {
      201: CheckinWithMemberResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new checkin',
    description: 'Record a new checkin for a member',
  },

  /**
   * Bulk create checkins (for offline sync)
   */
  bulkCreateCheckins: {
    method: 'POST',
    path: '/api/checkins/bulk',
    body: BulkCreateCheckinsSchema,
    responses: {
      201: BulkOperationResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Bulk create checkins',
    description: 'Create multiple checkins at once (used for offline sync from kiosks)',
  },

  /**
   * Update checkin (e.g., flag for review)
   */
  updateCheckin: {
    method: 'PATCH',
    path: '/api/checkins/:id',
    pathParams: IdParamSchema,
    body: UpdateCheckinSchema,
    responses: {
      200: CheckinWithMemberResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update checkin',
    description: 'Update checkin properties (e.g., flag for review, change direction)',
  },

  /**
   * Delete checkin
   */
  deleteCheckin: {
    method: 'DELETE',
    path: '/api/checkins/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete checkin',
    description: 'Delete a checkin by its unique ID',
  },

  /**
   * Get current presence status
   */
  getPresenceStatus: {
    method: 'GET',
    path: '/api/checkins/presence',
    responses: {
      200: PresenceStatusResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get presence status',
    description: 'Get current presence statistics (total present, by division)',
  },

  /**
   * Get checkins for a specific member
   */
  getMemberCheckins: {
    method: 'GET',
    path: '/api/members/:id/checkins',
    pathParams: IdParamSchema,
    query: CheckinListQuerySchema,
    responses: {
      200: CheckinListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get member checkins',
    description: 'Get all checkins for a specific member',
  },
})
