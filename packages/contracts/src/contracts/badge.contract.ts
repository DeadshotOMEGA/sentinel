import { initContract } from '@ts-rest/core'
import {
  CreateBadgeSchema,
  UpdateBadgeSchema,
  AssignBadgeSchema,
  BadgeWithAssignmentResponseSchema,
  BadgeListQuerySchema,
  BadgeListResponseSchema,
  BadgeStatsResponseSchema,
  ErrorResponseSchema,
  IdParamSchema,
  SuccessResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Badge API contract
 *
 * Defines all badge-related endpoints with request/response schemas
 */
export const badgeContract = c.router({
  /**
   * Get all badges with pagination and filtering
   */
  getBadges: {
    method: 'GET',
    path: '/api/badges',
    query: BadgeListQuerySchema,
    responses: {
      200: BadgeListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all badges',
    description:
      'Get paginated list of badges with optional filtering by status and assignment type',
  },

  /**
   * Get badge statistics
   * NOTE: Must be before getBadgeById to avoid :id matching 'stats'
   */
  getBadgeStats: {
    method: 'GET',
    path: '/api/badges/stats',
    responses: {
      200: BadgeStatsResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get badge statistics',
    description: 'Get badge statistics (total, assigned, unassigned, by status)',
  },

  /**
   * Get badge by serial number
   * NOTE: Must be before getBadgeById to avoid :id matching 'serial'
   */
  getBadgeBySerialNumber: {
    method: 'GET',
    path: '/api/badges/serial/:serialNumber',
    pathParams: c.type<{ serialNumber: string }>(),
    responses: {
      200: BadgeWithAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get badge by serial number',
    description: 'Find a badge by its serial number',
  },

  /**
   * Get single badge by ID
   * NOTE: Must be after specific paths like /stats and /serial/:serialNumber
   */
  getBadgeById: {
    method: 'GET',
    path: '/api/badges/:id',
    pathParams: IdParamSchema,
    responses: {
      200: BadgeWithAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get badge by ID',
    description: 'Retrieve a single badge by its unique ID',
  },

  /**
   * Create new badge
   */
  createBadge: {
    method: 'POST',
    path: '/api/badges',
    body: CreateBadgeSchema,
    responses: {
      201: BadgeWithAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create new badge',
    description: 'Create a new badge with the provided information',
  },

  /**
   * Update existing badge
   */
  updateBadge: {
    method: 'PATCH',
    path: '/api/badges/:id',
    pathParams: IdParamSchema,
    body: UpdateBadgeSchema,
    responses: {
      200: BadgeWithAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update badge',
    description: 'Update an existing badge with the provided information',
  },

  /**
   * Assign badge to member or visitor
   */
  assignBadge: {
    method: 'POST',
    path: '/api/badges/:id/assign',
    pathParams: IdParamSchema,
    body: AssignBadgeSchema,
    responses: {
      200: BadgeWithAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Assign badge',
    description: 'Assign a badge to a member or visitor',
  },

  /**
   * Unassign badge
   */
  unassignBadge: {
    method: 'POST',
    path: '/api/badges/:id/unassign',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: BadgeWithAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Unassign badge',
    description: 'Unassign a badge from its current assignment',
  },

  /**
   * Delete badge
   */
  deleteBadge: {
    method: 'DELETE',
    path: '/api/badges/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete badge',
    description: 'Delete a badge by its unique ID',
  },
})
