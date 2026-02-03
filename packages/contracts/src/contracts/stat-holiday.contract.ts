import { initContract } from '@ts-rest/core'
import {
  StatHolidaySchema,
  StatHolidayListResponseSchema,
  StatHolidayQuerySchema,
  CreateStatHolidaySchema,
  UpdateStatHolidaySchema,
  IsHolidayResponseSchema,
  HolidayDateParamSchema,
  ErrorResponseSchema,
  IdParamSchema,
  SuccessResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Stat Holiday API contract
 *
 * Defines all stat holiday-related endpoints for managing statutory holidays
 * that affect DDS handover timing.
 */
export const statHolidayContract = c.router({
  // ============================================================================
  // List & Query Endpoints
  // ============================================================================

  /**
   * Get all stat holidays
   */
  getAll: {
    method: 'GET',
    path: '/api/stat-holidays',
    query: StatHolidayQuerySchema,
    responses: {
      200: StatHolidayListResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get all stat holidays',
    description: 'Get all statutory holidays with optional filtering by year, province, or active status',
  },

  /**
   * Check if a specific date is a holiday
   */
  isHoliday: {
    method: 'GET',
    path: '/api/stat-holidays/check/:date',
    pathParams: HolidayDateParamSchema,
    responses: {
      200: IsHolidayResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Check if date is a holiday',
    description: 'Check if a specific date is a statutory holiday',
  },

  /**
   * Get a specific stat holiday by ID
   */
  getById: {
    method: 'GET',
    path: '/api/stat-holidays/:id',
    pathParams: IdParamSchema,
    responses: {
      200: StatHolidaySchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get stat holiday by ID',
    description: 'Get a specific statutory holiday by its ID',
  },

  // ============================================================================
  // CRUD Endpoints
  // ============================================================================

  /**
   * Create a new stat holiday
   */
  create: {
    method: 'POST',
    path: '/api/stat-holidays',
    body: CreateStatHolidaySchema,
    responses: {
      201: StatHolidaySchema,
      400: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create stat holiday',
    description: 'Create a new statutory holiday',
  },

  /**
   * Update a stat holiday
   */
  update: {
    method: 'PATCH',
    path: '/api/stat-holidays/:id',
    pathParams: IdParamSchema,
    body: UpdateStatHolidaySchema,
    responses: {
      200: StatHolidaySchema,
      400: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update stat holiday',
    description: 'Update an existing statutory holiday',
  },

  /**
   * Delete a stat holiday
   */
  delete: {
    method: 'DELETE',
    path: '/api/stat-holidays/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete stat holiday',
    description: 'Delete a statutory holiday',
  },
})
