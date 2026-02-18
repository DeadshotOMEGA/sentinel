import { initContract } from '@ts-rest/core'
import {
  CreateCheckinSchema,
  BulkCreateCheckinsSchema,
  UpdateCheckinSchema,
  CheckinWithMemberResponseSchema,
  CheckinListQuerySchema,
  CheckinListResponseSchema,
  PresenceStatusResponseSchema,
  PresentPeopleResponseSchema,
  RecentActivityResponseSchema,
  RecentActivityQuerySchema,
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
   * Get current presence status
   * NOTE: Must be before getCheckinById to avoid :id matching 'presence'
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
   * Get all present people (members + visitors)
   * NOTE: Must be before getCheckinById to avoid :id matching 'presence'
   */
  getPresentPeople: {
    method: 'GET',
    path: '/api/checkins/presence/people',
    responses: {
      200: PresentPeopleResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get present people',
    description: 'Get all currently present members and visitors for dashboard display',
  },

  /**
   * Get recent activity (checkins + visitor sign-ins)
   * NOTE: Must be before getCheckinById to avoid :id matching 'activity'
   */
  getRecentActivity: {
    method: 'GET',
    path: '/api/checkins/activity',
    query: RecentActivityQuerySchema,
    responses: {
      200: RecentActivityResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get recent activity',
    description: 'Get combined recent check-ins and visitor sign-ins for the activity feed',
  },

  /**
   * Get single checkin by ID
   * NOTE: Must be after specific paths like /presence
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
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new checkin',
    description: 'Record a new checkin for a member. Checkout (direction=out) is blocked if the member holds lockup responsibility.',
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
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete checkin',
    description: 'Delete a checkin by its unique ID',
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
